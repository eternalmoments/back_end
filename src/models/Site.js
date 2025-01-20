import mongoose from 'mongoose';

const siteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  meetingDate: {
    type: Date,
    required: true
  },
  photos: [{
    url: String,
    caption: String
  }],
  messages: [{
    content: String,
    position: {
      x: Number,
      y: Number
    }
  }],
  theme: {
    type: String,
    default: 'default'
  }
}, { timestamps: true });

export default mongoose.model('Site', siteSchema);