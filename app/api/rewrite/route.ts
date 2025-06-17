/*
<ai_context>
This API route handles text rewriting requests using OpenAI with personal style adaptation.
</ai_context>
*/

import { openai, REWRITE_PROMPT } from "@/lib/openai"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    console.log("Rewrite API route called")
    
    const { text, writingSample } = await req.json()
    
    if (!text || typeof text !== "string") {
      console.log("Invalid text provided to rewrite API")
      return NextResponse.json(
        { error: "Text is required and must be a string" },
        { status: 400 }
      )
    }
    
    if (!writingSample || typeof writingSample !== "string") {
      console.log("Invalid writing sample provided to rewrite API")
      return NextResponse.json(
        { error: "Writing sample is required and must be a string" },
        { status: 400 }
      )
    }
    
    console.log("Rewriting text of length:", text.length, "with writing sample of length:", writingSample.length)
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: REWRITE_PROMPT
        },
        {
          role: "user",
          content: `Writing Sample:\n${writingSample}\n\nText to Rewrite:\n${text}`
        }
      ],
      temperature: 0.7,
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
    
    console.log("Rewrite completed successfully")
    
    return NextResponse.json({ rewrittenText: response })
  } catch (error) {
    console.error("Error in rewrite API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 