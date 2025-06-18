/*
<ai_context>
This client component provides a TipTap-based rich text editor with grammar checking and personal style features.
</ai_context>
*/

"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Highlight from "@tiptap/extension-highlight"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import CodeBlock from "@tiptap/extension-code-block"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import Table from "@tiptap/extension-table"
import TableRow from "@tiptap/extension-table-row"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"
import { useCallback, useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Strikethrough, 
  Code, 
  Heading1, 
  Heading2, 
  List, 
  ListOrdered, 
  Quote, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Link as LinkIcon,
  Image as ImageIcon,
  CheckSquare,
  Table as TableIcon,
  Save,
  Loader2,
  AlertCircle,
  BookOpen
} from "lucide-react"
import { cn } from "@/lib/utils"
import { GrammarMark, GrammarIssue } from './grammar-mark-extension'

interface TipTapEditorProps {
  content?: string
  onContentChange?: (content: string) => void
  onSave?: (content: string) => void
  documentId?: string
  className?: string
  placeholder?: string
  readOnly?: boolean
  grammarSidebarOpen?: boolean
  onManualSave?: (content: string) => void
}

// Helper function to detect word boundaries for smart grammar checking
function detectWordBoundary(oldText: string, newText: string): boolean {
  if (!oldText || !newText) return false
  
  // If text got shorter (deletion), check immediately
  if (newText.length < oldText.length) {
    console.log("[detectWordBoundary] Text deletion detected, triggering word boundary")
    return true
  }
  
  // If text got longer, check the last character added
  const lastChar = newText[newText.length - 1]
  
  // Word boundary characters: space, punctuation, newline
  const wordBoundaryChars = [' ', '.', ',', '!', '?', ';', ':', '\n', '\t', '(', ')', '[', ']', '{', '}', '"', "'"]
  const isWordBoundary = wordBoundaryChars.includes(lastChar)
  
  if (isWordBoundary) {
    console.log("[detectWordBoundary] Word boundary character detected:", JSON.stringify(lastChar))
  }
  
  return isWordBoundary
}

// Helper function to map plain text positions to document positions
function mapTextPositionsToDocumentPositions(editor: any, issues: GrammarIssue[]): GrammarIssue[] {
  if (!editor || !issues || issues.length === 0) {
    console.log("🔍 [PositionMapper] No editor or issues to map")
    return []
  }

  console.log("🔍 [PositionMapper] Starting position mapping for", issues.length, "issues")
  const mappedIssues: GrammarIssue[] = []
  const doc = editor.state.doc
  
  // Get the exact plain text as sent to the API
  const editorPlainText = editor.getText()
  console.log("📝 [PositionMapper] Editor plain text length:", editorPlainText.length)
  console.log("📝 [PositionMapper] Editor plain text:", `"${editorPlainText}"`)
  
  // Build a comprehensive mapping from plain text positions to document positions
  const plainTextToDocPositionMap: number[] = []
  let plainTextIndex = 0
  
  // Walk through the document and build position mapping
  doc.descendants((node: any, docPos: number) => {
    if (node.isText && node.text) {
      console.log("📄 [PositionMapper] Processing text node at doc position", docPos, "with text:", `"${node.text}"`)
      
      // Map each character in this text node
      for (let i = 0; i < node.text.length; i++) {
        const char = node.text[i]
        const currentDocPos = docPos + i
        
        // Verify character matches plain text
        if (plainTextIndex < editorPlainText.length && editorPlainText[plainTextIndex] === char) {
          plainTextToDocPositionMap[plainTextIndex] = currentDocPos
          plainTextIndex++
        } else {
          console.warn("⚠️  [PositionMapper] Character mismatch at plainTextIndex", plainTextIndex, 
            "- expected:", JSON.stringify(editorPlainText[plainTextIndex]), "got:", JSON.stringify(char))
        }
      }
    }
    return true
  })
  
  console.log("📊 [PositionMapper] Built position map with", plainTextToDocPositionMap.length, "entries")
  console.log("📊 [PositionMapper] Plain text length:", editorPlainText.length)
  console.log("📊 [PositionMapper] Position map sample (first 20):", plainTextToDocPositionMap.slice(0, 20))
  
  // Process each issue
  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i]
    const issueId = `Issue ${i + 1}`
    
    console.log(`🔍 [PositionMapper] ${issueId}: Processing issue`, {
      type: issue.type,
      plainTextStart: issue.start,
      plainTextEnd: issue.end,
      explanation: issue.explanation,
      suggestion: issue.suggestion
    })
    
    // Validate issue positions against plain text
    if (issue.start < 0 || issue.end > editorPlainText.length || issue.start >= issue.end) {
      console.warn(`⚠️  [PositionMapper] ${issueId}: Invalid positions - start: ${issue.start}, end: ${issue.end}, text length: ${editorPlainText.length}`)
      continue
    }
    
    // Extract the error text from plain text
    const errorTextFromPlainText = editorPlainText.substring(issue.start, issue.end)
    console.log(`📝 [PositionMapper] ${issueId}: Error text from plain text:`, `"${errorTextFromPlainText}"`)
    
    // Map to document positions
    const docStart = plainTextToDocPositionMap[issue.start]
    const docEnd = issue.end > 0 ? (plainTextToDocPositionMap[issue.end - 1] + 1) : plainTextToDocPositionMap[issue.start] + 1
    
    if (docStart === undefined || docEnd === undefined) {
      console.warn(`⚠️  [PositionMapper] ${issueId}: Cannot map positions - docStart: ${docStart}, docEnd: ${docEnd}`)
      
      // Fallback: try to find the text in the document using a more robust search
      console.log(`🔍 [PositionMapper] ${issueId}: Attempting fallback search for:`, `"${errorTextFromPlainText}"`)
      
      let fallbackDocStart = -1
      let fallbackDocEnd = -1
      
      // Search through all text nodes for the error text
      doc.descendants((node: any, docPos: number) => {
        if (node.isText && node.text && fallbackDocStart === -1) {
          const textContent = node.text
          const searchIndex = textContent.indexOf(errorTextFromPlainText)
          
          if (searchIndex !== -1) {
            fallbackDocStart = docPos + searchIndex
            fallbackDocEnd = fallbackDocStart + errorTextFromPlainText.length
            console.log(`✅ [PositionMapper] ${issueId}: Fallback search successful - doc positions: ${fallbackDocStart}-${fallbackDocEnd}`)
            return false // Stop searching
          }
        }
        return true
      })
      
      if (fallbackDocStart !== -1) {
        const mappedIssue: GrammarIssue = {
          ...issue,
          start: fallbackDocStart,
          end: fallbackDocEnd
        }
        
        // Verify fallback mapping
        const verificationText = doc.textBetween(fallbackDocStart, fallbackDocEnd)
        console.log(`✅ [PositionMapper] ${issueId}: Fallback verification - expected: "${errorTextFromPlainText}", got: "${verificationText}", match: ${errorTextFromPlainText === verificationText}`)
        
        mappedIssues.push(mappedIssue)
      } else {
        console.warn(`❌ [PositionMapper] ${issueId}: Fallback search failed, skipping issue`)
      }
      continue
    }
    
    // Create mapped issue
    const mappedIssue: GrammarIssue = {
      ...issue,
      start: docStart,
      end: docEnd
    }
    
    // Verify mapping accuracy
    const verificationText = doc.textBetween(docStart, docEnd)
    const mappingValid = errorTextFromPlainText === verificationText
    
    console.log(`📍 [PositionMapper] ${issueId}: Mapping result`, {
      plainTextPositions: `${issue.start}-${issue.end}`,
      docPositions: `${docStart}-${docEnd}`,
      expectedText: `"${errorTextFromPlainText}"`,
      actualText: `"${verificationText}"`,
      mappingValid
    })
    
    if (mappingValid) {
      mappedIssues.push(mappedIssue)
      console.log(`✅ [PositionMapper] ${issueId}: Successfully mapped and verified`)
    } else {
      console.warn(`❌ [PositionMapper] ${issueId}: Mapping verification failed, skipping issue`)
    }
  }
  
  console.log("📊 [PositionMapper] Final results:")
  console.log("📊 [PositionMapper] Original issues:", issues.length)
  console.log("📊 [PositionMapper] Successfully mapped:", mappedIssues.length)
  console.log("📊 [PositionMapper] Failed to map:", issues.length - mappedIssues.length)
  console.log("📊 [PositionMapper] Mapped issues:", mappedIssues)
  
  return mappedIssues
}

export default function TipTapEditor({
  content = "",
  onContentChange,
  onSave,
  documentId,
  className,
  placeholder = "Start writing...",
  readOnly = false,
  grammarSidebarOpen = true,
  onManualSave
}: TipTapEditorProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [grammarIssues, setGrammarIssues] = useState<GrammarIssue[]>([])
  const [isCheckingGrammar, setIsCheckingGrammar] = useState(false)
  const [selectedIssueIndex, setSelectedIssueIndex] = useState<number | null>(null)

  // Debounced content change handler
  const debouncedContentChange = useCallback(
    debounce((content: string) => {
      console.log("[TipTapEditor] Content changed, triggering onChange callback")
      onContentChange?.(content)
    }, 1000),
    [onContentChange]
  )

  // Grammar check function - will be set after editor is initialized
  const grammarCheckRef = useRef<((text: string, trigger?: 'typing' | 'word-boundary' | 'immediate') => void) | null>(null)
  
  // Track the last text to detect word boundaries
  const lastTextRef = useRef<string>("")

  // Editor setup with GrammarMark extension
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Exclude codeBlock from StarterKit to avoid duplication
        codeBlock: false
      }),
      Placeholder.configure({
        placeholder
      }),
      Highlight,
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"]
      }),
      Link.configure({
        openOnClick: false
      }),
      Image,
      CodeBlock, // Use explicit CodeBlock extension
      TaskList,
      TaskItem.configure({
        nested: true
      }),
      Table.configure({
        resizable: true
      }),
      TableRow,
      TableHeader,
      TableCell,
      GrammarMark.configure({
        issues: grammarIssues,
        selectedIndex: selectedIssueIndex
      })
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      const text = editor.getText()
      console.log("[TipTapEditor] Editor updated, content length:", html.length, "text length:", text.length)
      debouncedContentChange(html)
      
      // Smart grammar check triggering
      if (grammarCheckRef.current) {
        const lastText = lastTextRef.current
        const isWordBoundary = detectWordBoundary(lastText, text)
        lastTextRef.current = text
        
        if (isWordBoundary) {
          console.log("[TipTapEditor] Word boundary detected, triggering immediate grammar check")
          grammarCheckRef.current(text, 'word-boundary')
        } else {
          console.log("[TipTapEditor] Regular typing, using debounced grammar check")
          grammarCheckRef.current(text, 'typing')
        }
      }
    }
  })

  // Optimized grammar check with different debounce strategies
  const performGrammarCheck = useCallback(async (text: string) => {
    if (!editor) {
      console.log("⚠️  [GrammarCheck] Editor not ready for grammar check")
      return
    }
    
    if (text.length < 10) {
      console.log("⚠️  [GrammarCheck] Text too short for grammar check:", text.length)
      return // Don't check very short text
    }
    
    setIsCheckingGrammar(true)
    console.log("🔍 [GrammarCheck] Starting grammar check")
    console.log("📝 [GrammarCheck] Text length:", text.length)
    console.log("📝 [GrammarCheck] Text being sent to API:", `"${text}"`)
    console.log("📝 [GrammarCheck] Text character breakdown:", text.split('').map((char, i) => `${i}: "${char}" (${char.charCodeAt(0)})`).slice(0, 50))
    
    try {
      const response = await fetch("/api/proofread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      })
      
      if (response.ok) {
        const { issues } = await response.json()
        console.log("📨 [GrammarCheck] Received", issues?.length || 0, "issues from API")
        
        if (issues && issues.length > 0) {
          console.log("📋 [GrammarCheck] Raw issues from API:", issues)
          
          // Validate that issues make sense with our text
          issues.forEach((issue: any, index: number) => {
            const issueText = text.substring(issue.start, issue.end)
            console.log(`📍 [GrammarCheck] API Issue ${index + 1}:`, {
              type: issue.type,
              positions: `${issue.start}-${issue.end}`,
              extractedText: `"${issueText}"`,
              suggestion: `"${issue.suggestion}"`,
              explanation: issue.explanation
            })
          })
        }
        
        // Map plain text positions to document positions
        const mappedIssues = mapTextPositionsToDocumentPositions(editor, issues || [])
        
        setGrammarIssues(mappedIssues)
        console.log("✅ [GrammarCheck] Grammar check completed successfully")
        console.log("📊 [GrammarCheck] Final result: found", issues?.length || 0, "raw issues, mapped", mappedIssues?.length || 0, "issues")
      } else {
        console.error("❌ [GrammarCheck] Grammar check API failed:", response.status, response.statusText)
        setGrammarIssues([])
      }
    } catch (error) {
      console.error("💥 [GrammarCheck] Error during grammar check:", error)
      setGrammarIssues([])
    } finally {
      setIsCheckingGrammar(false)
      console.log("🏁 [GrammarCheck] Grammar check process completed")
    }
  }, [editor])

  // Fast debounced grammar check for word boundaries (300ms)
  const debouncedWordBoundaryCheck = useCallback(
    debounce((text: string) => performGrammarCheck(text), 300),
    [performGrammarCheck]
  )

  // Slower debounced grammar check for regular typing (800ms)
  const debouncedTypingCheck = useCallback(
    debounce((text: string) => performGrammarCheck(text), 800),
    [performGrammarCheck]
  )

  // Smart grammar check dispatcher
  const smartGrammarCheck = useCallback((text: string, trigger: 'typing' | 'word-boundary' | 'immediate' = 'typing') => {
    switch (trigger) {
      case 'immediate':
        console.log("[TipTapEditor] Immediate grammar check triggered")
        performGrammarCheck(text)
        break
      case 'word-boundary':
        console.log("[TipTapEditor] Word boundary grammar check triggered (300ms debounce)")
        debouncedWordBoundaryCheck(text)
        break
      case 'typing':
      default:
        console.log("[TipTapEditor] Regular typing grammar check triggered (800ms debounce)")
        debouncedTypingCheck(text)
        break
    }
  }, [performGrammarCheck, debouncedWordBoundaryCheck, debouncedTypingCheck])

  // Set the grammar check function in the ref
  useEffect(() => {
    grammarCheckRef.current = smartGrammarCheck
  }, [smartGrammarCheck])

  // Update GrammarMark extension options when grammarIssues or selectedIssueIndex changes
  useEffect(() => {
    if (editor) {
      // @ts-ignore
      editor.extensionManager.extensions.forEach(ext => {
        if (ext.name === 'grammarMark') {
          ext.options.issues = grammarIssues
          ext.options.selectedIndex = selectedIssueIndex
        }
      })
      if (editor.view) {
        editor.view.dispatch(editor.view.state.tr)
      }
      console.log('[TipTapEditor] Updated GrammarMark extension options', { 
        grammarIssuesCount: grammarIssues.length, 
        selectedIssueIndex 
      })
    }
  }, [grammarIssues, selectedIssueIndex, editor])

  // Add this useEffect to update editor content when the content prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      console.log("[TipTapEditor] Setting editor content for new document", { 
        contentLength: content.length,
        currentEditorContent: editor.getHTML().length 
      })
      editor.commands.setContent(content || "")
    }
    // Clear grammar issues and trigger grammar check for new content
    if (content && grammarCheckRef.current) {
      setGrammarIssues([])
      console.log("[TipTapEditor] Triggering grammar check for new document content")
      // Remove HTML tags for plain text
      const plainText = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
      grammarCheckRef.current(plainText, 'immediate')
    }
  }, [content, editor])

  // Save handler
  const handleSave = async () => {
    if (!editor || !onSave) {
      console.log("[TipTapEditor] Cannot save - missing editor or onSave callback")
      return
    }
    
    setIsSaving(true)
    console.log("[TipTapEditor] Starting document save process")
    
    try {
      const content = editor.getHTML()
      console.log("[TipTapEditor] Saving document content, length:", content.length)
      await onSave(content)
      console.log("[TipTapEditor] Document saved successfully")
    } catch (error) {
      console.error("[TipTapEditor] Error saving document:", error)
    } finally {
      setIsSaving(false)
      console.log("[TipTapEditor] Save process completed")
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        console.log("[TipTapEditor] Save keyboard shortcut triggered")
        if (onManualSave && editor) {
          onManualSave(editor.getHTML())
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      console.log("[TipTapEditor] Removing keyboard event listeners")
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [editor, onManualSave])

  if (!editor) {
    console.log("[TipTapEditor] Editor not initialized, showing loading state")
    return <div className="flex items-center justify-center p-8">Loading editor...</div>
  }

  const getIssueColor = (type: string) => {
    switch (type) {
      case "grammar": return "bg-red-100 text-red-800 border-red-200"
      case "spelling": return "bg-red-100 text-red-800 border-red-200"
      case "style": return "bg-blue-100 text-blue-800 border-blue-200"
      case "clarity": return "bg-yellow-100 text-yellow-800 border-yellow-200"
      default: return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  console.log("[TipTapEditor] Rendering editor with", grammarIssues.length, "grammar issues")

  return (
    <div className={cn("flex gap-4", className)}>
      {/* Main Editor Area */}
      <div className={cn("flex-1 flex flex-col space-y-4 transition-all duration-300", grammarSidebarOpen ? "" : "w-full")}>
        {/* Toolbar */}
        {!readOnly && (
          <Card className="p-2">
            <div className="flex flex-wrap items-center gap-1">
              {/* Text formatting */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  console.log("[TipTapEditor] Bold button clicked")
                  editor.chain().focus().toggleBold().run()
                }}
                data-active={editor.isActive("bold")}
                className="data-[active=true]:bg-accent"
              >
                <Bold className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  console.log("[TipTapEditor] Italic button clicked")
                  editor.chain().focus().toggleItalic().run()
                }}
                data-active={editor.isActive("italic")}
                className="data-[active=true]:bg-accent"
              >
                <Italic className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  console.log("[TipTapEditor] Underline button clicked")
                  editor.chain().focus().toggleUnderline().run()
                }}
                data-active={editor.isActive("underline")}
                className="data-[active=true]:bg-accent"
              >
                <UnderlineIcon className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  console.log("[TipTapEditor] Strikethrough button clicked")
                  editor.chain().focus().toggleStrike().run()
                }}
                data-active={editor.isActive("strike")}
                className="data-[active=true]:bg-accent"
              >
                <Strikethrough className="h-4 w-4" />
              </Button>
              
              <Separator orientation="vertical" className="h-6" />
              
              {/* Headings */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  console.log("[TipTapEditor] Heading 1 button clicked")
                  editor.chain().focus().toggleHeading({ level: 1 }).run()
                }}
                data-active={editor.isActive("heading", { level: 1 })}
                className="data-[active=true]:bg-accent"
              >
                <Heading1 className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  console.log("[TipTapEditor] Heading 2 button clicked")
                  editor.chain().focus().toggleHeading({ level: 2 }).run()
                }}
                data-active={editor.isActive("heading", { level: 2 })}
                className="data-[active=true]:bg-accent"
              >
                <Heading2 className="h-4 w-4" />
              </Button>
              
              <Separator orientation="vertical" className="h-6" />
              
              {/* Lists */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  console.log("[TipTapEditor] Bullet list button clicked")
                  editor.chain().focus().toggleBulletList().run()
                }}
                data-active={editor.isActive("bulletList")}
                className="data-[active=true]:bg-accent"
              >
                <List className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  console.log("[TipTapEditor] Ordered list button clicked")
                  editor.chain().focus().toggleOrderedList().run()
                }}
                data-active={editor.isActive("orderedList")}
                className="data-[active=true]:bg-accent"
              >
                <ListOrdered className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  console.log("[TipTapEditor] Task list button clicked")
                  editor.chain().focus().toggleTaskList().run()
                }}
                data-active={editor.isActive("taskList")}
                className="data-[active=true]:bg-accent"
              >
                <CheckSquare className="h-4 w-4" />
              </Button>
              
              <Separator orientation="vertical" className="h-6" />
              
              {/* Other formatting */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  console.log("[TipTapEditor] Blockquote button clicked")
                  editor.chain().focus().toggleBlockquote().run()
                }}
                data-active={editor.isActive("blockquote")}
                className="data-[active=true]:bg-accent"
              >
                <Quote className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  console.log("[TipTapEditor] Code button clicked")
                  editor.chain().focus().toggleCode().run()
                }}
                data-active={editor.isActive("code")}
                className="data-[active=true]:bg-accent"
              >
                <Code className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  console.log("[TipTapEditor] Code block button clicked")
                  editor.chain().focus().toggleCodeBlock().run()
                }}
                data-active={editor.isActive("codeBlock")}
                className="data-[active=true]:bg-accent"
              >
                <Code className="h-4 w-4" />
              </Button>
              
              <Separator orientation="vertical" className="h-6" />
              
              {/* Alignment */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  console.log("[TipTapEditor] Align left button clicked")
                  editor.chain().focus().setTextAlign("left").run()
                }}
                data-active={editor.isActive({ textAlign: "left" })}
                className="data-[active=true]:bg-accent"
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  console.log("[TipTapEditor] Align center button clicked")
                  editor.chain().focus().setTextAlign("center").run()
                }}
                data-active={editor.isActive({ textAlign: "center" })}
                className="data-[active=true]:bg-accent"
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  console.log("[TipTapEditor] Align right button clicked")
                  editor.chain().focus().setTextAlign("right").run()
                }}
                data-active={editor.isActive({ textAlign: "right" })}
                className="data-[active=true]:bg-accent"
              >
                <AlignRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Editor content */}
        <Card className="min-h-[400px] flex-1">
          <EditorContent 
            editor={editor} 
            className="prose prose-sm max-w-none p-4 focus:outline-none h-full"
          />
        </Card>
      </div>

      {/* Grammar Issues Sidebar */}
      {grammarSidebarOpen && (
        <div className="w-80 flex flex-col transition-all duration-300 h-full max-h-[calc(100vh-10rem)]">
          <Card className="flex-1 h-full">
            <div className="p-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span className="font-medium">Grammar Assistant</span>
                </div>
                {isCheckingGrammar && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Checking...</span>
                  </div>
                )}
              </div>
              
              {grammarIssues.length > 0 && (
                <div className="mt-2">
                  <Badge variant="destructive" className="text-xs">
                    {grammarIssues.length} issue{grammarIssues.length !== 1 ? "s" : ""} found
                  </Badge>
                </div>
              )}
            </div>
            
            <ScrollArea className="flex-1 p-2 overflow-y-auto h-full max-h-[calc(100vh-14rem)]">
              {grammarIssues.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No grammar issues found</p>
                  <p className="text-xs mt-1">Keep writing to see suggestions</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {grammarIssues.map((issue, index) => (
                    <div
                      key={index}
                      className={cn(
                        "p-2 rounded border text-xs cursor-pointer flex flex-col gap-1 transition-all duration-200 hover:shadow-sm bg-white",
                        getIssueColor(issue.type),
                        selectedIssueIndex === index && 'ring-2 ring-offset-2 ring-primary shadow-md'
                      )}
                      onClick={() => {
                        const newIndex = index === selectedIssueIndex ? null : index
                        setSelectedIssueIndex(newIndex)
                        console.log('[TipTapEditor] Selected grammar issue', { 
                          index: newIndex, 
                          issue: newIndex !== null ? issue : null 
                        })
                      }}
                      onMouseEnter={() => {
                        setSelectedIssueIndex(index)
                        console.log('[TipTapEditor] Hovering over grammar issue', { index, issue })
                      }}
                      onMouseLeave={() => {
                        setSelectedIssueIndex(null)
                        console.log('[TipTapEditor] Stopped hovering over grammar issue')
                      }}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <Badge variant="secondary" className="text-2xs capitalize px-1 py-0.5">
                          {issue.type}
                        </Badge>
                        <span className="text-2xs text-muted-foreground">
                          {issue.start}-{issue.end}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="truncate flex-1">{issue.explanation}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-green-700 font-medium">{issue.suggestion}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="px-2 py-0.5 text-xs"
                          onClick={e => {
                            e.stopPropagation()
                            // Accept: Replace text in editor
                            if (!editor) return
                            editor.commands.focus()
                            editor.commands.insertContentAt({ from: issue.start, to: issue.end }, issue.suggestion)
                            setGrammarIssues(prev => prev.filter((_, i) => i !== index))
                            setSelectedIssueIndex(null)
                            console.log('[TipTapEditor] Accepted suggestion', { issue, index })
                          }}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="px-2 py-0.5 text-xs text-muted-foreground"
                          onClick={e => {
                            e.stopPropagation()
                            setGrammarIssues(prev => prev.filter((_, i) => i !== index))
                            setSelectedIssueIndex(null)
                            console.log('[TipTapEditor] Dismissed suggestion', { issue, index })
                          }}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>
        </div>
      )}
    </div>
  )
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
} 