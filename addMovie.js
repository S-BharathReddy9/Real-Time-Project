require('dotenv').config({ path: './server/.env' });
const mongoose = require('mongoose');
const Video = require('./server/models/Video');
const User = require('./server/models/User');

const seedMovie = async () => {
  try {
    // 1. Connect to MongoDB using your backend's connection string
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected...');

    // 2. Find any default user to be the "uploader" of this video
    const user = await User.findOne();
    if (!user) {
      console.log('Error: You need to create at least one user account on your app first!');
      process.exit(1);
    }

    // 3. Create the Video object
    const newMovie = await Video.create({
      title: "My Amazing First Movie",
      description: "This is a movie I added from my seed script!",
      thumbnailUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=1025",
      videoUrl: "C:\Home\WhatsApp Video 2026-03-21 at 19.07.50.mp4", // Replace this with your actual video link (S3, Mux, Cloudinary)
      uploadedBy: user._id
    });

    console.log('🎉 Success! Your movie was added to the database:');
    console.log(newMovie);

    process.exit(0);
  } catch (error) {
    console.error('Error adding movie:', error);
    process.exit(1);
  }
};

seedMovie();
