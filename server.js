const app = require("./app");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

const { createServer } = require("http");
const { Server } = require("socket.io");
const User = require("./models/user.model");
const Chat = require("./models/chat.model");

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

dotenv.config({ path: "./config.env" });

const DB = process.env.DATABASE;

mongoose.connect(DB).then(() => {
  // console.log(con.connections);
  console.log("DB connection successful");
});

// For testing API's on POSTMAN
const port = process.env.PORT || 5000;

io.on("connection", (socket) => {
  
  // Join a room based on recipient's ID when a user connects
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
  });
 
  socket.on("chatMessage", async (data) => {
  
    try {

      // Find the sender and recipient in the database
      const sender = await User.findOne({ email: data.sender.senderEmail });
      const recipient = await User.findOne({ email: data.recipient.email });

      // Create a new chat instance
      const newChat = new Chat({
        sender: sender._id,
        receiver: recipient._id,
        message: data.message,
      });

      
      // Save the chat message to the database
      await newChat.save();

      io.to(sender._id.toString() + recipient._id.toString()).emit("messageSaved", newChat);
      io.to(recipient._id.toString() + sender._id.toString()).emit("messageReceived", newChat);

      // console.log("Message saved:", newChat);

    } catch (error) {
      console.error("Error saving message:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

server.listen(port, () => {
  console.log(`Server is listening at : http://localhost:${port}`);
});