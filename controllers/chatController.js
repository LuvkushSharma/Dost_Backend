const Chat = require("./../models/chat.model");
const catchAsync = require("./../utils/catchAsync");

exports.getChats = async (req, res) => {
  try {
    const { recipientId } = req.params;
    const senderId = req.user._id; // Assuming you have stored the user ID in the request object after authentication

    // Find all chats between the recipient and sender
    const chats = await Chat.find({
      $or: [
        { sender: senderId, receiver: recipientId },
        { sender: recipientId, receiver: senderId },
      ],
    }).sort({ timestamp: 1 });

    res.status(200).json({
      status: "success",
      data: {
        chats,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};


exports.deleteMessage = catchAsync(async (req, res, next) => {
  const { senderId, receiverId, message } = req.body;

  // Check if the required parameters are provided
  if (!senderId || !receiverId || !message) {
    return res.status(400).json({ status: 'fail', message: 'Missing required parameters' });
  }

  try {
    // Find the message to delete based on sender ID, receiver ID, and message content
    const deletedMessage = await Chat.findOneAndDelete({ 
      sender: senderId, 
      receiver: receiverId, 
      message: message 
    });

    if (!deletedMessage) {
      return res.status(404).json({ status: 'fail', message: 'Message not found' });
    }

    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});


// Controller function to edit a message
exports.editMessage = async (req, res) => {
  try {
    const { senderId, receiverId, oldMessage, newMessage } = req.body;


    // Check if senderId and receiverId are provided
    if (!senderId || !receiverId) {
      return res.status(400).json({ message: 'SenderId and ReceiverId are required' });
    }

    // Find the message to be edited
    const message = await Chat.findOneAndUpdate(
      { sender : senderId, receiver: receiverId, message: oldMessage },
      { message: newMessage },
      { new: true }
    );

    // Check if the message was found and updated
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Send the updated message as response
    res.status(200).json({ message });
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};