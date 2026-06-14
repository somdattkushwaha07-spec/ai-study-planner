require("dotenv").config();
const mongoose = require("mongoose");
const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const Plan = require("./models/Plans");

const app = express();
const PORT = 5000;

// This tells your app: Use Render's online variable first. 
// If that doesn't exist (like when you code offline), use localhost.
const dbURI = process.env.MONGO_URI || 'mongodb://localhost:27017/study_planner';

mongoose.connect(dbURI)
  .then(() => console.log("🚀 DB Connected Successfully!"))
  .catch(err => console.error("❌ DB Connection Error:", err));

  
// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
})

/* ========================================================================== */
/* ✅ TAILORED STUDY PLAN API ENHANCEMENT                                     */
/* ========================================================================== */
app.post('/planner', async (req, res) => {
    // 1. EXTRACT NEW CUSTOMIZATION FIELDS FROM REQUEST BODY
    const { subject, hours, examDate, difficulty, topics, studyStyle, bufferDays } = req.body;

    // Basic Validation (Ensuring old structural dependencies remain filled)
    if (!subject || !hours || !examDate || !difficulty) {
        return res.status(400).json({
            success: false,
            message: "All primary fields are required."
        });
    }

    try {
        const today = new Date();
        const exam = new Date(examDate);
        const formattedToday = today.toLocaleDateString('en-CA'); // YYYY-MM-DD

        const timeDiff = exam.getTime() - today.getTime();
        const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        if (daysRemaining < 0) {
            return res.status(400).json({
                success: false,
                message: "The exam date cannot be in the past."
            });
        }

        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            systemInstruction: `You are a strict academic planner. 
            The current year is 2026.
            You MUST baseline all timelines starting from today's date: ${formattedToday}. 
            Do not reference 2024, 2025, or any other timeframe. 
            Strictly adhere to the exact days remaining provided by the user.`
        });

        // 2. CONSTRUCT STRONGLY TYPED CUSTOM PROMPT
        let prompt = `You are a strict academic planner. Generate a highly structured study plan for the subject "${subject}" with a "${difficulty}" difficulty level, assuming ${hours} hours of study per day until the exam on ${examDate}.

`;

        // Inject Topic Constraints if provided
        if (topics && topics.trim() !== "") {
            prompt += `TARGET TOPICS TO FOCUS ON:\nThe student explicitly wants to focus on studying these specific topics: ${topics}.\n\n`;
        }

        // Inject Study Style Guidelines
        prompt += `LEARNING METHODOLOGY CONSTRAINT:\nUtilize a ${studyStyle} approach. Ensure tasks directly reflect this preference.\n\n`;

        // Inject Calendar Structural Requirements
        if (bufferDays === true) {
            prompt += `CALENDAR RESTRICTION:\nLeave all Sundays completely blank or designated strictly as "Catch-up / Rest Days". Do not assign new study topics on Sundays.\n\n`;
        } else {
            prompt += `CALENDAR RESTRICTION:\nYou may distribute tasks across all consecutive days including weekends.\n\n`;
        }

        prompt += `You are an expert academic planner. Generate a highly structured, day-by-day study schedule.

        CRITICAL FORMATTING RULES:
        1. Break down the schedule using distinct day headers exactly like this: "Day 1:", "Day 2:", etc.
        2. Don't give description or explanations. Just list the study tasks for each day in bullet points.
        3. For EVERY study task line, you MUST search for or provide a real, highly relevant, high-quality public educational resource link (e.g., Wikipedia articles, YouTube videos, or official documentation/w3schools).
        4. Append the link strictly at the end of the task line using this exact pattern: [Link: HTTPS_URL_HERE]
        5.For the links, do not invent specific video IDs. Instead, provide a YouTube search query URL using the keywords of the topic. Format it like this: [Link: https://www.youtube.com/results?search_query=your+topic+keywords+here]

        Example Output format:
        Day 1:
        - Study the fundamentals of React components. [Link: https://react.dev/learn/your-first-component]
        - Practice creating state variables. [Link: https://en.wikipedia.org/wiki/State_(computer_science)]

        Day 2:
        - Learn basic Git commands like commit and push. [Link: https://www.youtube.com/watch?v=RGOj5yH7evk]
        `;

        // 3. EXECUTE MACHINE GENERATION LOOPS
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Save to MongoDB
        const newPlan = new Plan({
            subject,
            hours,
            examDate,
            difficulty,
            planText: text
        });
        await newPlan.save();

        res.json({
            success: true,  
            message: text
        });

    } catch (error) {
        console.error("FULL ERROR:", error.message);
        res.status(500).json({
            success: false,
            message: "Error generating customized plan."
        });
    }
});
// GET /planner — fetch all saved plans
app.get('/planner', async (req, res) => {
    try {
        const plans = await Plan.find().sort({ _id: -1 }).limit(20);
        res.json(plans);
    } catch (error) {
        console.error("Error fetching plans:", error);
        res.status(500).json({ success: false, message: "Error fetching plans." });
    }
});
// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});