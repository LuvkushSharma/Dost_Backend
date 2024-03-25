const express = require("express");
const path = require("path");

const authController = require(path.join(
  __dirname,
  "../controllers/authController"
));

const userController = require(path.join(
  __dirname,
  "../controllers/userController"
));

const chatController = require(path.join(
  __dirname,
  "../controllers/chatController"
));

const paymentController = require(path.join(
  __dirname,
  "../controllers/paymentController"
));

const app = express();
const router = express.Router();

router.route("/signup").post(authController.signUp);
router.route("/login").post(authController.login);
router.route("/logout").post(authController.logout);
router.route("/checkAuth").get(authController.isLoggedIn);

router.route("/profile").get(authController.protect, userController.getUser);
router
  .route("/deleteMe")
  .delete(authController.protect, authController.deleteMe);

router.route("/suggest").get(authController.protect, userController.suggest);
router
  .route("/suggest/:id")
  .delete(authController.protect, userController.deleteSuggestion);

router
  .route("/friend-request")
  .post(authController.protect, userController.sendFriendRequest);
router
  .route("/requests")
  .get(authController.protect, userController.getFriendRequests);
router
  .route("/requestAccepted")
  .post(authController.protect, userController.acceptFriendRequest);

router
  .route("/request/:id")
  .delete(authController.protect, userController.deleteRequest);

router
  .route("/friendsList")
  .get(authController.protect, userController.getFriendsList);
router
  .route("/chats/:recipientId")
  .get(authController.protect, chatController.getChats);
router
  .route("/chats/delete")
  .delete(authController.protect, chatController.deleteMessage);

// Route for editing a message
router
  .route("/chats/edit")
  .put(authController.protect, chatController.editMessage);

router
  .route("/update")
  .patch(authController.protect, userController.updateUserSchema);

router.route("/forgotPassword").post(authController.forgotPassword);
router.route("/resetPassword/:token").patch(authController.resetPassword);

router.route("/contact").post(authController.contactUs);
router
  .route("/send-otp")
  .post(authController.protect, authController.otpSending);
router.route("/verify-otp").post(authController.verifyOTP);

router.route("/pay").post(authController.protect, paymentController.pay);

router.route("/friend-counts").get(authController.protect, userController.friendsCount);

module.exports = router;
