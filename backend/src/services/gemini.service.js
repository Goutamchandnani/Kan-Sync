import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const API_KEY = process.env.GEMINI_API_KEY;
console.log("GEMINI_API_KEY:", API_KEY ? "Set" : "Not Set");

if (!API_KEY) {
  console.error("GEMINI_API_KEY is not set in the environment variables.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

async function generateTaskSuggestions(title, description) {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
  const year = date.getFullYear();
  const today = `${day}-${month}-${year}`;
  const prompt = `
  You are an AI assistant that analyses tasks.

  CURRENT_DATE: "${today}"
  TASK TITLE: "${title}"
  TASK DESCRIPTION: "${description}"

  Your job:
  1. Suggest priority → choose only from ["Low", "Medium", "High"]
  2. Suggest a deadline → give a date in DD-MM-YYYY format. Apply the following logic:
     - If priority is High → 1-2 days from today
     - If priority is Medium → 3-5 days from today
     - If priority is Low → 7-14 days from today
  3. Explain your reasoning in 1 sentence.

  Return the result in the following JSON format ONLY:

  {
    "priority": "...",
    "deadline": "...",
    "reason": "..."
  }
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    if (!jsonMatch || !jsonMatch[1]) {
      throw new Error("Could not extract JSON from Gemini response.");
    }
    const parsedText = JSON.parse(jsonMatch[1]);
    if (parsedText.deadline) {
      const [day, month, year] = parsedText.deadline.split('-');
      parsedText.deadline = `${year}-${month}-${day}`;
    }
    parsedText.priority = parsedText.priority.toLowerCase();
    return parsedText;
  } catch (error) {
    console.error("Error generating task suggestions from Gemini:", error.message, error.stack);
    return {
      priority: "medium",
      deadline: null,
      reason: "Could not generate suggestions."
    };
  }
}

export { generateTaskSuggestions };
