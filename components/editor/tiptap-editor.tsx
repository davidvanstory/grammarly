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
  const [selectedIssueIndex, setSelectedIssueIndex] = useState<number | null>(null)

  // Debounced content change handler
  const debouncedContentChange = useCallback(
    debounce((content: string) => {
      console.log("[TipTapEditor] Content changed, triggering onChange callback")
      onContentChange?.(content)
    }, 1000),
    [onContentChange]
  )

  // Debounced grammar check
  const debouncedGrammarCheck = useCallback(
    debounce(async (text: string) => {
      if (text.length < 10) {
        console.log("[TipTapEditor] Text too short for grammar check:", text.length)
        return // Don't check very short text
      }
      
      setIsCheckingGrammar(true)
      console.log("[TipTapEditor] Starting grammar check for text of length:", text.length)
      
      try {
        const response = await fetch("/api/proofread", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text })
        })
        
        if (response.ok) {
          const { issues } = await response.json()
          setGrammarIssues(issues || [])
          console.log("[TipTapEditor] Grammar check completed, found", issues?.length || 0, "issues:", issues)
        } else {
          console.error("[TipTapEditor] Grammar check failed:", response.statusText)
          setGrammarIssues([])
        }
      } catch (error) {
        console.error("[TipTapEditor] Error checking grammar:", error)
        setGrammarIssues([])
      } finally {
        setIsCheckingGrammar(false)
        console.log("[TipTapEditor] Grammar check process completed")
      }
    }, 2000),
    []
  )

  // Editor setup with GrammarMark extension
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
      debouncedGrammarCheck(text)
    }
  })

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
    if (content) {
      setGrammarIssues([])
      console.log("[TipTapEditor] Triggering grammar check for new document content")
      debouncedGrammarCheck(content.replace(/<[^>]+>/g, " ")) // Remove HTML tags for plain text
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
        handleSave()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      console.log("[TipTapEditor] Removing keyboard event listeners")
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [editor])

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
      <div className="flex-1 flex flex-col space-y-4">
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
              
              <Separator orientation="vertical" className="h-6" />
              
              {/* Save button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  console.log("[TipTapEditor] Save button clicked")
                  handleSave()
                }}
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

        {/* Editor content */}
        <Card className="min-h-[400px] flex-1">
          <EditorContent 
            editor={editor} 
            className="prose prose-sm max-w-none p-4 focus:outline-none h-full"
          />
        </Card>
      </div>

      {/* Grammar Issues Sidebar */}
      <div className="w-80 flex flex-col">
        <Card className="flex-1">
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
          
          <ScrollArea className="flex-1 p-3">
            {grammarIssues.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No grammar issues found</p>
                <p className="text-xs mt-1">Keep writing to see suggestions</p>
              </div>
            ) : (
              <div className="space-y-3">
                {grammarIssues.map((issue, index) => (
                  <div
                    key={index}
                    className={cn(
                      "p-3 rounded-lg border text-sm cursor-pointer transition-all duration-200 hover:shadow-sm",
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
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {issue.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {issue.start}-{issue.end}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-xs leading-relaxed">{issue.explanation}</p>
                      <div className="text-xs">
                        <span className="font-medium text-green-700">Suggestion:</span>
                        <p className="mt-1 text-green-600">{issue.suggestion}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>
      </div>
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