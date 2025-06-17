/*
<ai_context>
This API route handles proofreading requests using OpenAI.
</ai_context>
*/

import { openai, PROOFREAD_PROMPT } from "@/lib/openai"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    console.log("Proofread API route called")
    
    const { text } = await req.json()
    
    if (!text || typeof text !== "string") {
      console.log("Invalid text provided to proofread API")
      return NextResponse.json(
        { error: "Text is required and must be a string" },
        { status: 400 }
      )
    }
    
    console.log("Proofreading text of length:", text.length)
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: PROOFREAD_PROMPT
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.1,
      max_tokens: 2000
    })
    
    const response = completion.choices[0]?.message?.content
    
    if (!response) {
      console.log("No response from OpenAI")
      return NextResponse.json(
        { error: "Failed to get response from AI" },
        { status: 500 }
      )
    }
    
    // Parse JSON response
    let issues
    try {
      issues = JSON.parse(response)
    } catch (parseError) {
      console.error("Failed to parse OpenAI response as JSON:", response)
      return NextResponse.json(
        { error: "Invalid response format from AI" },
        { status: 500 }
      )
    }
    
    console.log("Proofread completed, found", issues.length, "issues")
    
    return NextResponse.json({ issues })
  } catch (error) {
    console.error("Error in proofread API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 