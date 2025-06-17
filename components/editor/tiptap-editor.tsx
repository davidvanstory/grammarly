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
import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"

interface TipTapEditorProps {
  content?: string
  onContentChange?: (content: string) => void
  onSave?: (content: string) => void
  documentId?: string
  className?: string
  placeholder?: string
  readOnly?: boolean
}

interface GrammarIssue {
  type: "grammar" | "spelling" | "style" | "clarity"
  start: number
  end: number
  suggestion: string
  explanation: string
}

export default function TipTapEditor({
  content = "",
  onContentChange,
  onSave,
  documentId,
  className,
  placeholder = "Start writing...",
  readOnly = false
}: TipTapEditorProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [grammarIssues, setGrammarIssues] = useState<GrammarIssue[]>([])
  const [isCheckingGrammar, setIsCheckingGrammar] = useState(false)
  const [showIssues, setShowIssues] = useState(false)

  // Debounced content change handler
  const debouncedContentChange = useCallback(
    debounce((content: string) => {
      onContentChange?.(content)
    }, 1000),
    [onContentChange]
  )

  // Debounced grammar check
  const debouncedGrammarCheck = useCallback(
    debounce(async (text: string) => {
      if (text.length < 10) return // Don't check very short text
      
      setIsCheckingGrammar(true)
      try {
        console.log("Checking grammar for text of length:", text.length)
        
        const response = await fetch("/api/proofread", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text })
        })
        
        if (response.ok) {
          const { issues } = await response.json()
          setGrammarIssues(issues || [])
          console.log("Grammar check completed, found", issues?.length || 0, "issues")
        } else {
          console.error("Grammar check failed:", response.statusText)
        }
      } catch (error) {
        console.error("Error checking grammar:", error)
      } finally {
        setIsCheckingGrammar(false)
      }
    }, 2000),
    []
  )

  const editor = useEditor({
    extensions: [
      StarterKit,
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
      CodeBlock,
      TaskList,
      TaskItem.configure({
        nested: true
      }),
      Table.configure({
        resizable: true
      }),
      TableRow,
      TableHeader,
      TableCell
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      const text = editor.getText()
      
      debouncedContentChange(html)
      debouncedGrammarCheck(text)
    }
  })

  // Add this useEffect to update editor content when the content prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      console.log("[TipTapEditor] Setting editor content for new document", { content })
      editor.commands.setContent(content || "")
    }
    // Clear grammar issues and trigger grammar check for new content
    if (content) {
      setGrammarIssues([])
      setShowIssues(false)
      console.log("[TipTapEditor] Triggering grammar check for new document content", { content })
      debouncedGrammarCheck(content.replace(/<[^>]+>/g, " ")) // Remove HTML tags for plain text
    }
  }, [content, editor])

  // Save handler
  const handleSave = async () => {
    if (!editor || !onSave) return
    
    setIsSaving(true)
    try {
      const content = editor.getHTML()
      await onSave(content)
      console.log("Document saved successfully")
    } catch (error) {
      console.error("Error saving document:", error)
    } finally {
      setIsSaving(false)
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        handleSave()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [editor])

  if (!editor) {
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

  return (
    <div className={cn("flex flex-col space-y-4", className)}>
      {/* Toolbar */}
      {!readOnly && (
        <Card className="p-2">
          <div className="flex flex-wrap items-center gap-1">
            {/* Text formatting */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              data-active={editor.isActive("bold")}
              className="data-[active=true]:bg-accent"
            >
              <Bold className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              data-active={editor.isActive("italic")}
              className="data-[active=true]:bg-accent"
            >
              <Italic className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              data-active={editor.isActive("underline")}
              className="data-[active=true]:bg-accent"
            >
              <UnderlineIcon className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleStrike().run()}
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
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              data-active={editor.isActive("heading", { level: 1 })}
              className="data-[active=true]:bg-accent"
            >
              <Heading1 className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
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
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              data-active={editor.isActive("bulletList")}
              className="data-[active=true]:bg-accent"
            >
              <List className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              data-active={editor.isActive("orderedList")}
              className="data-[active=true]:bg-accent"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleTaskList().run()}
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
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              data-active={editor.isActive("blockquote")}
              className="data-[active=true]:bg-accent"
            >
              <Quote className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleCode().run()}
              data-active={editor.isActive("code")}
              className="data-[active=true]:bg-accent"
            >
              <Code className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
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
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              data-active={editor.isActive({ textAlign: "left" })}
              className="data-[active=true]:bg-accent"
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
              data-active={editor.isActive({ textAlign: "center" })}
              className="data-[active=true]:bg-accent"
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
              data-active={editor.isActive({ textAlign: "right" })}
              className="data-[active=true]:bg-accent"
            >
              <AlignRight className="h-4 w-4" />
            </Button>
            
            <Separator orientation="vertical" className="h-6" />
            
            {/* Save button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="ml-auto"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </Card>
      )}

      {/* Grammar issues indicator */}
      {grammarIssues.length > 0 && (
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="destructive">
                {grammarIssues.length} issue{grammarIssues.length !== 1 ? "s" : ""}
              </Badge>
              {isCheckingGrammar && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Checking...
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowIssues(!showIssues)}
            >
              {showIssues ? "Hide" : "Show"} Issues
            </Button>
          </div>
          
          {showIssues && (
            <div className="mt-3 space-y-2">
              {grammarIssues.map((issue, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-2 rounded border text-sm",
                    getIssueColor(issue.type)
                  )}
                >
                  <div className="font-medium capitalize">{issue.type}</div>
                  <div className="text-xs mt-1">{issue.explanation}</div>
                  <div className="text-xs mt-1">
                    <strong>Suggestion:</strong> {issue.suggestion}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Editor content */}
      <Card className="min-h-[400px]">
        <EditorContent 
          editor={editor} 
          className="prose prose-sm max-w-none p-4 focus:outline-none"
        />
      </Card>
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