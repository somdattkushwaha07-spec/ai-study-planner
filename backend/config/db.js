const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Looks for Render's environment variable first; defaults to local only during development
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/study_planner');
    console.log(`🚀 MongoDB Connected successfully: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ DB Connection Error: ${error}`);
    process.exit(1);
  }
};

module.exports = connectDB;