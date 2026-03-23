import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  clerkId: { type: String, unique: true, required: true },
  name: String,
  email: { type: String, unique: true },
  resumeText: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
export default User;
