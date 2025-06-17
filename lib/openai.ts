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
export const PROOFREAD_PROMPT = `You are an expert grammar and spelling checker with meticulous attention to detail. Analyze the given text carefully and return ALL issues found in JSON format:

[{
  "type": "grammar" | "spelling" | "style" | "clarity",
  "start": number,
  "end": number,
  "suggestion": "improved text",
  "explanation": "brief explanation of the issue"
}]

CRITICAL: Pay special attention to these common errors:
- Irregular verbs (e.g., "runned" → "ran", "goed" → "went", "bringed" → "brought")
- Subject-verb agreement ("he have" → "he has")
- Tense consistency and proper verb forms
- Spelling mistakes and typos
- Apostrophe usage (its vs it's, contractions)
- Homophones (there/their/they're, your/you're, to/too/two)
- Word choice and vocabulary errors
- Sentence fragments and run-on sentences
- Double negatives
- Misplaced modifiers

Focus areas (in order of priority):
1. Spelling errors and typos
2. Irregular verb forms and tense errors  
3. Subject-verb agreement
4. Grammar and syntax errors
5. Style and clarity improvements

Be thorough and catch ALL errors, even subtle ones. Every spelling mistake, grammar error, and awkward phrasing should be identified.

IMPORTANT: Your response must be ONLY valid JSON in the exact format specified above. Do not include any explanatory text, markdown formatting, or additional commentary. Return only the JSON array.

If no issues found, return: []`

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