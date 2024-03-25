const mongoose = require("mongoose");
const validator = require("validator");

const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please tell us your name!"],
  },

  email: {
    type: String,
    required: [true, "Please provide your email"],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, "Please provide a valid email"],
  },

  photo: String,

  password: {
    type: String,
    required: [true, "Please provide a password"],
    minlength: 8,
    select: false,
  },

  passwordConfirm: {
    type: String,
    required: [true, "Please confirm your password"],

    validate: {
      validator: function (pc) {
        return this.password === pc;
      },

      message: "Password and ConfirmPassword are not the same",
    },
  },

  programmingLanguages: {
    type: [String],
    required: [
      true,
      "Please provide programming languages in which you feel comfortable.",
    ],
    enum: [
      "JavaScript",
      "Python",
      "Java",
      "C/C++",
      "C#",
      "PHP",
      "Dart",
      "Other",
    ],

    default: [], // Allow empty array
    validate: {
      validator: (v) => Array.isArray(v),
      message: "Programming languages must be an array of strings",
    },
  },

  frameworks: {
    type: [String],
    enum: ["React", "Angular", "Vue.js", "Express", "Django", "Flask", "Other"],

    default: [], // Allow empty array
    validate: {
      validator: (v) => Array.isArray(v),
      message: "Frameworks must be an array of strings",
    },
  },

  libraries: {
    type: [String],
    enum: [
      "Pandas",
      "Numpy",
      "Matplotlib",
      "Seaborn",
      "Scikit-learn",
      "Tensorflow",
      "Keras",
      "Pytorch",
      "React-router",
      "Material-UI",
      "Redux",
      "Axios",
      "Other",
    ],

    default: [], // Allow empty array
    validate: {
      validator: (v) => Array.isArray(v),
      message: "Frameworks must be an array of strings",
    },
  },

  hobbies: {
    type: [String],
    required: [true, "Please provide your hobbies"],

    trim: true,
    default: [],
  },

  participatedInHackathon: {
    type: Boolean,
    default: false,
  },

  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },

  title: {
    type: String,
    enum: [
      "Data Scientist",
      "Full Stack Developer",
      "Frontend Developer",
      "Backend Developer",
      "Mobile App Developer",
      "DevOps Engineer",
      "UI/UX Designer",
      "QA",
      "Cloud Engineer",
      "Other",
    ],
    default: "Other", // Set a default value
  },

  cloudinaryImageUrl: {
    type: String,
    default:
      "https://res.cloudinary.com/dx2vel6vy/image/upload/v1710573655/default_uv0cmg.png",
  },

  rejectedUsers: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "User",
    default: [],
  },

  passwordChangedAt: Date,

  passwordResetToken: String,
  passwordResetExpires: Date,

  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.pre("save", async function (next) {

  // Only run this function if password was actually modified
  if (!this.isModified("password")) return next();

  if (this.isModified("rejectedUsers")) {
    return next();
  }

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // If passwordConfirm exists and the document is being modified, unset passwordConfirm
  if (this.passwordConfirm && this.isModified('password')) {
    this.passwordConfirm = undefined;
  }
  next();
});

userSchema.pre("save", function (next) {

  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }

  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  // plain reset token string that we will pass to the user on it's email
  const resetToken = crypto.randomBytes(32).toString("hex");

  // hashed reset token that we will use for comparing the plain string with the hashed reset string.
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  console.log({ resetToken }, this.passwordResetToken);

  // Reset token expires in 10min
  this.passwordResetExpires = Date.now() + 1000 * 60 * 1000;

  // used to send by the email
  return resetToken;
};

userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

// Where 'User' is the collection name in the database.
const User = mongoose.model("User", userSchema);

module.exports = User;
