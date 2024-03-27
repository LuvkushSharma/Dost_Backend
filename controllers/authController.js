const path = require("path");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const crypto = require("crypto");

const User = require(path.join(__dirname, "/../models/user.model"));
const OTP = require(path.join(__dirname, "/../models/otp.model"));
const catchAsync = require(path.join(__dirname, "/../utils/catchAsync"));
const AppError = require(path.join(__dirname, "./../utils/appError"));
const Email = require(path.join(__dirname, "./../utils/email"));

const { sendOTP } = require(path.join(__dirname, "./../utils/otp"));
const { randomInt } = require("crypto");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

// Creating a new User
exports.signUp = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    photo: req.body.photo,
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    programmingLanguages: req.body.programmingLanguages,
    frameworks: req.body.frameworks,
    libraries: req.body.libraries,
    hobbies: req.body.hobbies,
    participatedInHackathon: req.body.participatedInHackathon,
    title: req.body.title,
  });

  const url = `https://dostfrnd.vercel.app/profile`;

  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  // Using ES6 destructuring
  const { email, password } = req.body;

  // 1️⃣ Check if email and password exists
  if (!email || !password) {
    return next(new AppError("Please provide email and password! 💥", 400));
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect Email or Password", 401));
  }

  // 3) If everything ok, send token to client
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {

  res
    .cookie("jwt", "loggedout", {
      // After 5s we will we log out.
      expires: new Date(Date.now() + 5 * 1000),
      httpOnly: true,
    })
    .status(200)
    .json({ status: "success" });
};

exports.protect = catchAsync(async (req, res, next) => {
  let token;

  console.log("req.cookies : ",req.cookies?.jwt);

  // if (
  //   req.headers?.authorization &&
  //   req.headers?.authorization.startsWith("Bearer")
  // ) {
  //   token = req.headers.authorization.split(" ")[1];
  // } else if (req.cookies?.jwt) {
  //   token = req.cookies?.jwt;
  // }

  console.log("req.cookies : ", req);

  token = localStorage.getItem("jwt");

  console.log("token : ",token);

  // their is no token
  if (!token) {
    return next(
      new AppError("You are not loggen in! Please login to get access", 401)
    );
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(
      new AppError(
        "The user belonging to this token does not longer exists.",
        401
      )
    );
  }

  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password! Please log in again.", 401)
    );
  }

  req.user = currentUser;
  res.locals.user = currentUser;

  next();
});

exports.isLoggedIn = catchAsync(async (req, res, next) => {
  try {
    if (req.cookies.jwt) {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);

      if (!currentUser) {
        return res
          .status(401)
          .json({ success: false, message: "User not found" });
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return res
          .status(401)
          .json({ success: false, message: "Password changed" });
      }

      // Set user in res.locals
      // res.locals.user = currentUser;
      return res.status(200).json({ success: true });
    } else {
      // User is not logged in
      return res
        .status(401)
        .json({ success: false, message: "User is not logged in" });
    }
  } catch (error) {
    // Internal server error
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You donot have permission to perform this action", 403)
      );
    }

    next();
  };
};

exports.deleteMe = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { active: false });

    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (err) {
    res.status(400).json({
      status: "fail",
      message: err,
    });
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    // 1️⃣ ) Get user based on Posted email
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return next(new AppError("There is no user with email address.", 404));
    }

    // 2️⃣ ) Generate the random reset token
    const resetToken = user.createPasswordResetToken();

    await user.save({ validateBeforeSave: false });

    try {
      // 3️⃣ ) Send it to user's email
      const resetURL = `https://dostfrnd.vercel.app/resetPassword/${resetToken}`;

      // --------- Lec_10 ----------
      await new Email(user, resetURL).sendPasswordReset();

      res.status(200).json({
        status: "success",
        message: "Token send to email",
      });
    } catch (err) {
      (User.createPasswordResetToken = undefined),
        (user.passwordResetExpires = undefined);

      await user.save({ validateBeforeSave: false });

      return next(
        new AppError("There was an error sending the email. Try again later!"),
        500
      );
    }
  } catch {
    res.status(404).json({
      status: "fail",
      message: "Try again to reset the password !",
    });
  }
};

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1️⃣) Get user based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select("+password");

  // 2️⃣) If token has not expired, and there is user, set the new password

  // No user exists
  if (!user) {
    return next(new AppError("Token is invalid or has expired"), 400);
  }

  // 3) Check if oldPassword matches with the password stored in the database
  const isPasswordCorrect = await user.correctPassword(
    req.body.oldPassword,
    user.password
  );

  if (!isPasswordCorrect) {
    return next(new AppError("Old password is incorrect", 400));
  }

  user.password = req.body.newPassword;
  user.passwordConfirm = req.body.confirmPassword;

  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  createSendToken(user, 200, res);
});

exports.contactUs = catchAsync(async (req, res, next) => {
  const firstName = req.body.name.split(" ")[0];

  const userDetails = {
    name: firstName,
    message: req.body.message,
  };

  await new Email(userDetails).sendIssues();
});

exports.otpSending = catchAsync(async (req, res) => {
  // Generate a 6-digit OTP
  //const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otp = randomInt(100000, 999999).toString();
  const userId = req.user._id;

  const otpInstance = await OTP.create({
    phone: req.body.phoneNumber,
    otp: otp,
    otpExpiration: Date.now() + 10 * 60 * 1000, // 10 minutes
  });

  // Send OTP via SMS
  await sendOTP(req.body.phoneNumber, otp);

  res.status(200).json({ success: true, message: "OTP sent successfully" });
});

exports.verifyOTP = catchAsync(async (req, res) => {
  const { phoneNumber, otp } = req.body;

  try {
    // Find user by phone number and OTP
    const user = await OTP.findOne({ phone: phoneNumber, otp });

    if (!user || user.otpExpiration < Date.now()) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    // Clear OTP and expiration time after successful verification
    user.otp = undefined;
    user.otpExpiration = undefined;
    await user.save({ validateBeforeSave: false });

    res
      .status(200)
      .json({ success: true, message: "OTP verified successfully" });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ success: false, message: "Failed to verify OTP" });
  }
});
