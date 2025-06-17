/*
<ai_context>
This API route handles readability analysis requests using OpenAI.
</ai_context>
*/

import { openai, READABILITY_PROMPT } from "@/lib/openai"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    console.log("Readability API route called")
    
    const { text } = await req.json()
    
    if (!text || typeof text !== "string") {
      console.log("Invalid text provided to readability API")
      return NextResponse.json(
        { error: "Text is required and must be a string" },
        { status: 400 }
      )
    }
    
    console.log("Analyzing readability for text of length:", text.length, "using model: gpt-4o-2024-11-20")
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-11-20",
      messages: [
        {
          role: "system",
          content: READABILITY_PROMPT
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.1,
      max_tokens: 500
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
    let metrics
    try {
      metrics = JSON.parse(response)
    } catch (parseError) {
      console.error("Failed to parse OpenAI response as JSON:", response)
      return NextResponse.json(
        { error: "Invalid response format from AI" },
        { status: 500 }
      )
    }
    
    console.log("Readability analysis completed:", metrics)
    
    return NextResponse.json({ metrics })
  } catch (error) {
    console.error("Error in readability API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 