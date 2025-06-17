/*
<ai_context>
Contains the OpenAI configuration for the app.
</ai_context>
*/

import OpenAI from "openai"

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: false // Only allow server-side usage
})

// System prompts for different AI tasks
export const PROOFREAD_PROMPT = `You are a professional grammar and style checker. Analyze the given text and return JSON issues in the following format:

[{
  "type": "grammar" | "spelling" | "style" | "clarity",
  "start": number,
  "end": number,
  "suggestion": "improved text",
  "explanation": "brief explanation of the issue"
}]

Focus on:
- Grammar errors (subject-verb agreement, tense consistency, etc.)
- Spelling mistakes
- Style improvements (word choice, sentence structure)
- Clarity issues (unclear phrasing, redundancy)

Only return valid JSON. If no issues found, return an empty array [].`

export const REWRITE_PROMPT = `You are a writing assistant that helps users rewrite text in their personal style. 

Given a user's writing sample and a passage to rewrite, analyze the user's writing style and rewrite the passage to match their tone, vocabulary, and sentence structure.

Consider:
- Vocabulary level and word choice
- Sentence length and complexity
- Tone (formal, casual, academic, etc.)
- Writing patterns and preferences

Return only the rewritten text, maintaining the same meaning but adapting to the user's style.`

export const READABILITY_PROMPT = `Analyze the given text and return readability metrics in JSON format:

{
  "wordCount": number,
  "sentenceCount": number,
  "averageWordLength": number,
  "averageSentenceLength": number,
  "fleschReadingEase": number,
  "complexity": "easy" | "moderate" | "difficult"
}

Calculate Flesch Reading Ease using the formula: 206.835 - (1.015 × average sentence length) - (84.6 × average syllable per word)

Complexity levels:
- Easy: 80-100
- Moderate: 60-79  
- Difficult: 0-59

Only return valid JSON.` 