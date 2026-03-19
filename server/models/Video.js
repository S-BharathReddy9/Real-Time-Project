const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please provide a video title'],
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    thumbnailUrl: {
        type: String,
        required: [true, 'Please provide a thumbnail URL'],
    },
    // This is the most important part! It points to where the file actually lives (e.g., AWS S3 URL)
    videoUrl: {
        type: String,
        required: [true, 'Please provide the video streaming URL'],
    },
    views: {
        type: Number,
        default: 0
    },
    tags: [{
        type: String
    }],
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Links to the user who uploaded the movie
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Video', videoSchema);
