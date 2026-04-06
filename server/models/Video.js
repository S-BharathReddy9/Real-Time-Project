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
    storage: {
        type: String,
        enum: ['external', 'local', 'gridfs'],
        default: 'external',
    },
    videoUrl: {
        type: String,
        trim: true,
    },
    gridFsFileId: {
        type: mongoose.Schema.Types.ObjectId,
    },
    mimeType: {
        type: String,
        default: 'video/mp4',
    },
    size: {
        type: Number,
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

videoSchema.pre('validate', function validateVideoSource(next) {
    if (!this.videoUrl && !this.gridFsFileId) {
        this.invalidate('videoUrl', 'Please provide the video streaming URL or upload a video file');
    }
    next();
});

module.exports = mongoose.model('Video', videoSchema);
