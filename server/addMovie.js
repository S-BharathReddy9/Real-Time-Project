require('dotenv').config();
const mongoose = require('mongoose');

// Define temporary standalone schemas so this script works independently of the project's models folder
const userSchema = new mongoose.Schema({
  username: String,
  email: String
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

const videoSchema = new mongoose.Schema({
  title: String,
  description: String,
  thumbnailUrl: String,
  videoUrl: String,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
const Video = mongoose.models.Video || mongoose.model('Video', videoSchema);

const seedMovie = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected successfully!');

    // Find any existing user
    let user = await User.findOne();
    if (!user) {
      console.log('No user found! Creating a temporary admin user...');
      user = await User.create({ username: 'Admin', email: 'admin@streamsphere.com' });
    }

    // Create the Video object
    const newMovie = await Video.create({
      title: "My Amazing First Movie",
      description: "This is a movie I added from my seed script!",
      thumbnailUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=1025",
      videoUrl: "C:\Home\WhatsApp Video 2026-03-21 at 19.07.50.mp4", // Replace with your videoURL
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
