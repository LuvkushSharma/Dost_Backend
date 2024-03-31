const path = require("path");

const User = require(path.join(__dirname, "./../models/user.model"));
const AppError = require("../utils/appError");
const catchAsync = require(path.join(__dirname, "./../utils/catchAsync"));
const FriendRequest = require("./../models/friendRequest.model");

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();

    res.status(200).json({
      status: "success",
      results: users.length,
      data: {
        users,
      },
    });
  } catch {
    res.status(404).json({
      status: "fail",
      message: "No user found !",
    });
  }
};

exports.updateMe = async (req, res, next) => {
  // 1️⃣) Create error if user POSTs password data as we had created a separate handler for that in the authController.js

  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "This route is not for password updates. Please use /updateMyPassword",
        400
      )
    );
  }

  // 2️⃣) Filtered out unwanted field names that are not allowed to be updated.
  const filteredBody = filterObj(req.body, "name", "email");

  // ---------- Lec_2 --------

  // Adding photo property to the filteredBody object from req.filename

  if (req.file) {
    filteredBody.photo = req.file.filename;
  }

  // 3️⃣) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
};

exports.getUser = async (req, res) => {
  const user = req.user;

  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
};

exports.deleteUser = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();

    res.status(200).json({
      status: "success",
      results: users.length,
      data: {
        users,
      },
    });
  } catch {
    res.status(404).json({
      status: "fail",
      message: "No user found !",
    });
  }
};

exports.suggest = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);

    // Fetch users matching the preferences of the current user
    const suggestedUsers = await User.find({
      $and: [
        { _id: { $ne: currentUser._id } }, // Exclude current user
        // { participatedInHackathon: currentUser.participatedInHackathon },
        { title: currentUser.title },
        { _id: { $nin: currentUser.rejectedUsers } }, // Exclude rejected users
      ],
    }).select("-password"); // Exclude password from the response

    // Respond with suggested users
    res.status(200).json({
      status: "success",
      data: {
        ...suggestedUsers,
      },
    });
  } catch (error) {
    // Handle error
    console.error("Error fetching suggested users:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

exports.sendFriendRequest = async (req, res, next) => {
  try {
    const { userId } = req.body;

    // Get the recipient user from the database
    const recipient = await User.findById(userId);

    if (!recipient) {
      return next(new ErrorResponse("Recipient user not found", 404));
    }

    const isExisted = await FriendRequest.findOne({
      recipient: recipient._id,
      sender: req.user._id,
    });

    if (isExisted) {
      return res
        .status(200)
        .json({ success: false, message: "Friend request already sent" });
    }

    // Create a new friend request
    const friendRequest = new FriendRequest({
      recipient: recipient._id,
      sender: req.user._id, // Assuming req.user contains the logged-in user's information
    });

    // Save the friend request
    await friendRequest.save();

    // Add logic to store the friend request in the recipient's profile
    // For example, you can add the sender's ID to the recipient's friend requests array

    // Send a success response
    res.status(200).json({
      success: true,
      message: `Friend request sent successfully to ${recipient.name}`,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteSuggestion = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Find the user by ID
  const user = await User.findById(id);

  // Check if the user exists
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  // Add the user to the rejectedUsers array
  const currentUser = await User.findById(req.user._id);

  currentUser.rejectedUsers.push(user._id);

  try {
    await currentUser.save({ validateBeforeSave: false });
  } catch (err) {
    console.log("err : ", err);
  }

  res
    .status(200)
    .json({ success: true, message: "User removed from suggestions" });
});

exports.getFriendRequests = async (req, res, next) => {
  try {
    const friendRequests = await FriendRequest.find({
      recipient: req.user._id,
    }).populate("sender", "name email cloudinaryImageUrl title");

    const currentUser = await User.findById(req.user._id);

    const filteredFriendRequests = friendRequests.filter((request) => {
      if (
        request.sender !== null &&
        !currentUser.rejectedUsers.includes(request.sender._id.toString())
      ) {
        return true;
      }
      return false;
    });

    res.status(200).json({ success: true, data: filteredFriendRequests });
  } catch (error) {
    next(error);
  }
};

exports.acceptFriendRequest = async (req, res, next) => {
  try {
    // Get the sender ID from the request body
    const senderId = req.body.userId;

    // Find the friend request by recipient ID and sender ID
    const friendRequest = await FriendRequest.findOne({
      recipient: req.user._id,
      sender: senderId,
    });

    // Check if the request exists
    if (!friendRequest) {
      return res
        .status(404)
        .json({ success: false, message: "Friend request not found" });
    }

    // Update the status to "accepted"
    friendRequest.status = "accepted";

    // Save the updated friend request
    await friendRequest.save();

    res
      .status(200)
      .json({ success: true, message: "Friend request accepted successfully" });
  } catch (error) {
    console.error("Error accepting friend request:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.deleteRequest = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Find the user by ID
  const user = await User.findById(id);

  // Check if the user exists
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  // Add the user to the rejectedUsers array
  const currentUser = await User.findById(req.user._id);

  currentUser.rejectedUsers.push(user._id);

  try {
    await currentUser.save({ validateBeforeSave: false });
  } catch (err) {
    console.log("err : ", err);
  }

  res
    .status(200)
    .json({ success: true, message: "User removed from suggestions/Request" });
});

exports.getFriendsList = async (req, res, next) => {
  try {
    // Get the user's friends list
    const friendsList = await FriendRequest.find({
      $or: [{ recipient: req.user._id }, { sender: req.user._id }],
      status: "accepted",
    })
      .populate("sender", "name email cloudinaryImageUrl title")
      .populate("recipient", "name email cloudinaryImageUrl title");

    // Filter out friends who are not existing
    const filteredFriendsList = friendsList.filter((friend) => {
      return friend.sender !== null && friend.recipient !== null;
    });

    const arr = filteredFriendsList.map((friend) => {
      const RecipientName = friend.recipient.name;
      const RecipientEmail = friend.recipient.email;
      const RecipientImageUrl = friend.recipient.cloudinaryImageUrl;
      const RecipientTitle = friend.recipient.title;

      const SenderName = friend.sender.name;
      const SenderEmail = friend.sender.email;
      const SenderImageUrl = friend.sender.cloudinaryImageUrl;
      const SenderTitle = friend.sender.title;

      if (friend.recipient._id.toString() === req.user._id.toString()) {
        return {
          name: SenderName,
          email: SenderEmail,
          cloudinaryImageUrl: SenderImageUrl,
          title: SenderTitle,
          id: friend.sender._id,
        };
      } else {
        return {
          name: RecipientName,
          email: RecipientEmail,
          cloudinaryImageUrl: RecipientImageUrl,
          title: RecipientTitle,
          id: friend.recipient._id,
        };
      }
    });

    const currentUser = await User.findById(req.user._id);

    const Sender = {
      senderName: currentUser.name,
      senderEmail: currentUser.email,
      senderImageUrl: currentUser.cloudinaryImageUrl,
      senderTitle: currentUser.title,
      senderId: currentUser._id,
    };

    arr.push(Sender);

    const uniqueArr = Array.from(new Set(arr.map(JSON.stringify))).map(
      JSON.parse
    );

    res.status(200).json({ success: true, data: uniqueArr });
  } catch (error) {
    console.error("Error fetching friends list:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.updateUserSchema = catchAsync(async (req, res, next) => {
  // Extract the Cloudinary image URL from the request body
  const { cloudinaryImageUrl } = req.body;

  // Check if the Cloudinary image URL is provided
  if (!cloudinaryImageUrl) {
    return next(new AppError("Cloudinary image URL is required", 400));
  }

  try {
    // Update the user's cloudinaryImageUrl property
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { cloudinaryImageUrl },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    res.status(200).json({
      status: "success",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
});

const friendCountsByCategory = {
  "Data Scientist": new Set(),
  "Full Stack Developer": new Set(),
  "Frontend Developer": new Set(),
  "Backend Developer": new Set(),
  "Mobile App Developer": new Set(),
  "DevOps Engineer": new Set(),
  "UI/UX Designer": new Set(),
  QA: new Set(),
  "Cloud Engineer": new Set(),
  Other: new Set(),
};

// GET request to fetch counts of friends for each category
exports.friendsCount = async (req, res) => {
  try {
    const friendCounts = await FriendRequest.aggregate([
      { $match: { status: "accepted" } },
    ]);

    await Promise.all(
      friendCounts.map(async (friend) => {
        const senderTitle = await User.findById(friend.sender);
        const recipientTitle = await User.findById(friend.recipient);

        if (senderTitle && recipientTitle) {
          let id = friend.sender.toString();
          friendCountsByCategory[senderTitle.title].add(id);

          id = friend.recipient.toString();
          friendCountsByCategory[recipientTitle.title].add(id);
        }
      })
    );

    const categoryLengths = {};

    for (const category in friendCountsByCategory) {
      categoryLengths[category] = friendCountsByCategory[category].size;
    }
    

    res.status(200).json({data: categoryLengths});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
