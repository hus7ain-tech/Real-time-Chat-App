import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getRecieverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUser = req.user._id; //current logged in user
    const filteredUsers = await User.find({
      _id: { $ne: loggedInUser },
    }).select("-password");

    res.status(200).json(filteredUsers); // find all users except the currently logged in user
  } catch (error) {
    console.log("error in getting users for sidebar", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        {
          senderId: myId,
          recieverId: userToChatId,
        },
        {
          senderId: userToChatId,
          recieverId: myId,
        },
      ],
    });

    res.status(200).json(messages);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;

    const { id: recieverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }
    const newMessage = new Message({
      senderId,
      recieverId,
      text,
      image: imageUrl,
    });

    await newMessage.save();

    //todo : realtime functionality will be implemented here.
    const recieverSocketId = getRecieverSocketId(recieverId);
    if (recieverSocketId) {
      io.to(recieverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json({ newMessage });
  } catch (error) {
    console.log("error in sendMessage controller.", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
