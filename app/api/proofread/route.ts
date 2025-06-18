/*
<ai_context>
This API route handles proofreading requests using OpenAI.
</ai_context>
*/

import { openai, PROOFREAD_PROMPT } from "@/lib/openai"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    console.log("🔍 [ProofreadAPI] Route called")
    
    const { text } = await req.json()
    
    if (!text || typeof text !== "string") {
      console.log("❌ [ProofreadAPI] Invalid text provided")
      return NextResponse.json(
        { error: "Text is required and must be a string" },
        { status: 400 }
      )
    }
    
    console.log("📝 [ProofreadAPI] Analyzing text:")
    console.log("📝 [ProofreadAPI] Text length:", text.length)
    console.log("📝 [ProofreadAPI] Text content:", `"${text}"`)
    console.log("📝 [ProofreadAPI] Using model: gpt-4o-2024-11-20")
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-11-20",
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
      temperature: 0.1, // Lower temperature for more consistent positioning
      max_tokens: 2000
    })
    
    const response = completion.choices[0]?.message?.content
    
    if (!response) {
      console.log("❌ [ProofreadAPI] No response from OpenAI")
      return NextResponse.json(
        { error: "Failed to get response from AI" },
        { status: 500 }
      )
    }
    
    console.log("🤖 [ProofreadAPI] Raw OpenAI response:", response)
    
    // Parse JSON response with robust error handling
    let issues
    try {
      // Try to parse the response directly first
      issues = JSON.parse(response)
    } catch (parseError) {
      console.error("❌ [ProofreadAPI] Direct JSON parse failed, attempting to extract JSON from response")
      
      // Try to extract JSON from response if it's wrapped in other text
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        try {
          issues = JSON.parse(jsonMatch[0])
          console.log("✅ [ProofreadAPI] Successfully extracted JSON from wrapped response")
        } catch (extractError) {
          console.error("❌ [ProofreadAPI] Failed to parse extracted JSON:", jsonMatch[0])
          console.error("❌ [ProofreadAPI] Extract error:", extractError instanceof Error ? extractError.message : String(extractError))
          return NextResponse.json(
            { error: "Invalid response format from AI" },
            { status: 500 }
          )
        }
      } else {
        console.error("❌ [ProofreadAPI] No JSON array found in response:", response)
        console.error("❌ [ProofreadAPI] Parse error:", parseError instanceof Error ? parseError.message : String(parseError))
        return NextResponse.json(
          { error: "Invalid response format from AI" },
          { status: 500 }
        )
      }
    }

    // Validate and log position accuracy
    console.log("🔍 [ProofreadAPI] Validating", issues.length, "issues for position accuracy")
    
    const validatedIssues = issues.filter((issue: any, index: number) => {
      const issueId = `Issue ${index + 1}`;
      console.log(`📍 [ProofreadAPI] ${issueId}:`, {
        type: issue.type,
        start: issue.start,
        end: issue.end,
        suggestion: issue.suggestion,
        explanation: issue.explanation
      })
      
      // Validate issue structure
      if (typeof issue.start !== 'number' || typeof issue.end !== 'number') {
        console.warn(`⚠️  [ProofreadAPI] ${issueId}: Invalid position types - start: ${typeof issue.start}, end: ${typeof issue.end}`)
        return false
      }
      
      // Validate position bounds
      if (issue.start < 0 || issue.end > text.length || issue.start >= issue.end) {
        console.warn(`⚠️  [ProofreadAPI] ${issueId}: Invalid position bounds - start: ${issue.start}, end: ${issue.end}, text length: ${text.length}`)
        return false
      }
      
      // Extract the actual text at the specified positions
      const extractedText = text.substring(issue.start, issue.end)
      console.log(`📍 [ProofreadAPI] ${issueId} extracted text:`, `"${extractedText}"`)
      
      // Log position verification
      console.log(`📍 [ProofreadAPI] ${issueId} position verification:`, {
        originalText: `"${text}"`,
        startPos: issue.start,
        endPos: issue.end,
        extractedText: `"${extractedText}"`,
        suggestion: `"${issue.suggestion}"`,
        textLength: text.length,
        extractedLength: extractedText.length
      })
      
      return true
    })
    
    console.log("✅ [ProofreadAPI] Validation complete:")
    console.log("📊 [ProofreadAPI] Total issues from AI:", issues.length)
    console.log("📊 [ProofreadAPI] Valid issues after filtering:", validatedIssues.length)
    console.log("📊 [ProofreadAPI] Issues filtered out:", issues.length - validatedIssues.length)
    
    return NextResponse.json({ issues: validatedIssues })
  } catch (error) {
    console.error("💥 [ProofreadAPI] Error in proofread API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 