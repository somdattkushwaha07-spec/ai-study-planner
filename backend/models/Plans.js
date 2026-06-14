const mongoose = require("mongoose");

const planSchema = new mongoose.Schema({
    subject: String,
    hours: Number,
    examDate: Date,
    difficulty: String,
    planText: String
});

module.exports = mongoose.model("Plan", planSchema);