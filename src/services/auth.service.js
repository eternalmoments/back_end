import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { SALT_ROUNDS, JWT_EXPIRES_IN } from '../config/auth.config.js';
import User from '../models/User.js';

export const createUser = async (userData) => {
  const { email, password, name } = userData;
  
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error('User already exists');
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const user = new User({
    email,
    password: hashedPassword,
    name
  });

  await user.save();
  return user;
};

export const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

export const verifyCredentials = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw new Error('Invalid credentials');
  }

  return user;
};