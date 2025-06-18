/*
<ai_context>
This client component provides the document editor interface with document management and TipTap editor..
</ai_context>
*/

"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { 
  Plus, 
  FileText, 
  Edit, 
  Trash2, 
  Save, 
  Calendar,
  Clock,
  FileEdit,
  BookOpen,
  Loader2,
  TrendingUp,
  ChevronRight,
  ChevronLeft
} from "lucide-react"
import TipTapEditor from "@/components/editor/tiptap-editor"
import { 
  createDocumentAction, 
  getDocumentsAction, 
  updateDocumentAction, 
  deleteDocumentAction 
} from "@/actions/db/documents-actions"
import { SelectDocument } from "@/db/schema"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { SignOutButton } from "@clerk/nextjs"

interface DocumentEditorClientProps {
  userId: string
}

interface ReadabilityMetrics {
  wordCount: number
  sentenceCount: number
  averageWordLength: number
  averageSentenceLength: number
  fleschReadingEase: number
  complexity: "easy" | "moderate" | "difficult"
}

// Readability Score Component
function ReadabilityScore({ 
  metrics, 
  isLoading 
}: { 
  metrics: ReadabilityMetrics | null
  isLoading: boolean 
}) {
  console.log("[ReadabilityScore] Rendering with metrics:", metrics, "isLoading:", isLoading)

  if (isLoading) {
    return (
      <Card className="border-2 border-dashed border-muted-foreground/20">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Analyzing readability...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!metrics) {
    return (
      <Card className="border-2 border-dashed border-muted-foreground/20">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            <span>Start writing to see readability</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50 border-green-200"
    if (score >= 60) return "text-yellow-600 bg-yellow-50 border-yellow-200"
    return "text-red-600 bg-red-50 border-red-200"
  }

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case "easy": return "bg-green-100 text-green-800 border-green-200"
      case "moderate": return "bg-yellow-100 text-yellow-800 border-yellow-200"  
      case "difficult": return "bg-red-100 text-red-800 border-red-200"
      default: return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <Card className="border-2">
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Readability Score</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className={cn(
              "px-2 py-1 rounded text-xs font-medium border",
              getScoreColor(metrics.fleschReadingEase)
            )}>
              {Math.round(metrics.fleschReadingEase)}
            </div>
            <Badge 
              variant="secondary" 
              className={cn("text-xs capitalize", getComplexityColor(metrics.complexity))}
            >
              {metrics.complexity}
            </Badge>
          </div>
          
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Avg sentence: {Math.round(metrics.averageSentenceLength)} words</div>
            <div>Avg word: {metrics.averageWordLength.toFixed(1)} chars</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DocumentEditorClient({ userId }: DocumentEditorClientProps) {
  const [documents, setDocuments] = useState<SelectDocument[]>([])
  const [currentDocument, setCurrentDocument] = useState<SelectDocument | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newDocumentTitle, setNewDocumentTitle] = useState("")
  const [showNewDocumentForm, setShowNewDocumentForm] = useState(false)
  
  // Readability state
  const [readabilityMetrics, setReadabilityMetrics] = useState<ReadabilityMetrics | null>(null)
  const [isAnalyzingReadability, setIsAnalyzingReadability] = useState(false)
  
  const { toast } = useToast()

  const [isGrammarSidebarOpen, setIsGrammarSidebarOpen] = useState(true)
  const [lastSavedContent, setLastSavedContent] = useState<string>("")
  const [isAutosaving, setIsAutosaving] = useState(false)

  // Load documents on mount
  useEffect(() => {
    loadDocuments()
  }, [userId])

  // Analyze readability when document changes
  useEffect(() => {
    if (currentDocument && currentDocument.content) {
      console.log("[DocumentEditor] Document changed, analyzing readability for:", currentDocument.id)
      analyzeReadability(currentDocument.content)
    } else {
      console.log("[DocumentEditor] No document or empty content, clearing readability")
      setReadabilityMetrics(null)
    }
  }, [currentDocument])

  // Autosave every minute if there are unsaved changes
  useEffect(() => {
    if (!currentDocument) return
    const interval = setInterval(() => {
      if (currentDocument.content !== lastSavedContent) {
        setIsAutosaving(true)
        saveDocument(currentDocument.content).then(() => {
          setLastSavedContent(currentDocument.content)
          setIsAutosaving(false)
          console.log("[Autosave] Document autosaved at", new Date().toLocaleTimeString())
        })
      }
    }, 60000) // 1 minute
    return () => clearInterval(interval)
  }, [currentDocument, lastSavedContent])

  // Update lastSavedContent when document is loaded or saved
  useEffect(() => {
    if (currentDocument) setLastSavedContent(currentDocument.content)
  }, [currentDocument])

  // Manual save handler for keyboard shortcut
  const handleManualSave = async (content: string) => {
    await saveDocument(content)
    setLastSavedContent(content)
  }

  // Debounced readability analysis function
  const analyzeReadability = useCallback(
    debounce(async (content: string) => {
      if (!content || content.length < 50) {
        console.log("[DocumentEditor] Content too short for readability analysis:", content.length)
        setReadabilityMetrics(null)
        return
      }

      console.log("[DocumentEditor] Starting readability analysis for content length:", content.length)
      setIsAnalyzingReadability(true)

      try {
        // Remove HTML tags for plain text analysis
        const plainText = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
        
        if (plainText.length < 50) {
          console.log("[DocumentEditor] Plain text too short after HTML removal:", plainText.length)
          setReadabilityMetrics(null)
          return
        }

        console.log("[DocumentEditor] Sending text to readability API, length:", plainText.length)

        const response = await fetch("/api/readability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: plainText })
        })

        if (response.ok) {
          const { metrics } = await response.json()
          console.log("[DocumentEditor] Readability analysis completed:", metrics)
          setReadabilityMetrics(metrics)
        } else {
          console.error("[DocumentEditor] Readability analysis failed:", response.statusText)
          setReadabilityMetrics(null)
          toast({
            title: "Readability Analysis Failed",
            description: "Could not analyze document readability",
            variant: "destructive"
          })
        }
      } catch (error) {
        console.error("[DocumentEditor] Error analyzing readability:", error)
        setReadabilityMetrics(null)
        toast({
          title: "Readability Analysis Error",
          description: "An error occurred while analyzing readability",
          variant: "destructive"
        })
      } finally {
        setIsAnalyzingReadability(false)
        console.log("[DocumentEditor] Readability analysis process completed")
      }
    }, 2000),
    []
  )

  const loadDocuments = async () => {
    console.log("Loading documents for user:", userId)
    setIsLoading(true)
    
    try {
      // Debug: Check if the action function is available
      console.log("[DocumentEditor] getDocumentsAction function:", typeof getDocumentsAction)
      if (typeof getDocumentsAction !== 'function') {
        console.error("[DocumentEditor] getDocumentsAction is not a function!")
        setDocuments([])
        toast({
          title: "Error",
          description: "Failed to load documents - action function not available",
          variant: "destructive"
        })
        return
      }
      
      console.log("[DocumentEditor] Calling getDocumentsAction with userId:", userId)
      const result = await getDocumentsAction(userId)
      
      console.log("[DocumentEditor] getDocumentsAction result:", result)
      console.log("[DocumentEditor] Result type:", typeof result)
      
      // Check if result exists and has the expected structure
      if (!result) {
        console.error("[DocumentEditor] getDocumentsAction returned undefined")
        setDocuments([])
        toast({
          title: "Error",
          description: "Failed to load documents - no response from server",
          variant: "destructive"
        })
        return
      }
      
      if (result.isSuccess) {
        console.log("[DocumentEditor] Documents loaded successfully:", result.data?.length || 0)
        setDocuments(result.data || [])
      } else {
        console.error("[DocumentEditor] Failed to load documents:", result.message)
        setDocuments([])
        toast({
          title: "Error",
          description: result.message || "Failed to load documents",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("[DocumentEditor] Error loading documents:", error)
      setDocuments([])
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
      console.log("[DocumentEditor] loadDocuments process completed")
    }
  }

  const createDocument = async () => {
    if (!newDocumentTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter a document title",
        variant: "destructive"
      })
      return
    }

    console.log("Creating new document:", newDocumentTitle)
    setIsCreating(true)
    
    try {
      const result = await createDocumentAction({
        userId,
        title: newDocumentTitle.trim(),
        content: "",
        wordCount: "0",
        characterCount: "0"
      })
      
      if (result.isSuccess) {
        const newDoc = result.data
        setDocuments(prev => [newDoc, ...prev])
        setCurrentDocument(newDoc)
        setNewDocumentTitle("")
        setShowNewDocumentForm(false)
        console.log("Document created successfully:", newDoc.id)
        
        toast({
          title: "Success",
          description: "Document created successfully"
        })
      } else {
        console.error("Failed to create document:", result.message)
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error creating document:", error)
      toast({
        title: "Error",
        description: "Failed to create document",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  const saveDocument = async (content: string) => {
    if (!currentDocument) return
    
    console.log("Saving document:", currentDocument.id)
    
    try {
      // Calculate word and character counts
      const textContent = content.replace(/<[^>]*>/g, '') // Remove HTML tags
      const wordCount = textContent.trim().split(/\s+/).filter(word => word.length > 0).length
      const characterCount = textContent.length
      
      const result = await updateDocumentAction(
        currentDocument.id,
        userId,
        {
          content,
          wordCount: wordCount.toString(),
          characterCount: characterCount.toString()
        }
      )
      
      if (result.isSuccess) {
        const updatedDoc = result.data
        setCurrentDocument(updatedDoc)
        setDocuments(prev => 
          prev.map(doc => doc.id === updatedDoc.id ? updatedDoc : doc)
        )
        console.log("Document saved successfully:", updatedDoc.id)
        
        // Trigger readability analysis for updated content
        console.log("[DocumentEditor] Document saved, triggering readability analysis")
        analyzeReadability(content)
        
        toast({
          title: "Saved",
          description: "Document saved successfully"
        })
      } else {
        console.error("Failed to save document:", result.message)
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error saving document:", error)
      toast({
        title: "Error",
        description: "Failed to save document",
        variant: "destructive"
      })
    }
  }

  const deleteDocument = async (documentId: string) => {
    console.log("Deleting document:", documentId)
    
    try {
      const result = await deleteDocumentAction(documentId, userId)
      
      if (result.isSuccess) {
        setDocuments(prev => prev.filter(doc => doc.id !== documentId))
        
        if (currentDocument?.id === documentId) {
          setCurrentDocument(null)
          setReadabilityMetrics(null) // Clear readability when document is deleted
        }
        
        console.log("Document deleted successfully:", documentId)
        
        toast({
          title: "Success",
          description: "Document deleted successfully"
        })
      } else {
        console.error("Failed to delete document:", result.message)
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error deleting document:", error)
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive"
      })
    }
  }

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === "string" ? new Date(dateString) : dateString
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    })
  }

  const formatTime = (dateString: string | Date) => {
    const date = typeof dateString === "string" ? new Date(dateString) : dateString
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading documents...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-end items-center mb-6 gap-2">
        <Button
          variant="outline"
          onClick={() => {
            if (currentDocument) handleManualSave(currentDocument.content)
          }}
          disabled={!currentDocument || currentDocument.content === lastSavedContent || isAutosaving}
        >
          {isAutosaving ? "Autosaving..." : "Save"}
        </Button>
        <SignOutButton redirectUrl="/">
          <Button variant="outline">
            Log Out
          </Button>
        </SignOutButton>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Document List Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </CardTitle>
              <Button
                onClick={() => setShowNewDocumentForm(true)}
                className="w-full"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Document
              </Button>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* New Document Form */}
              {showNewDocumentForm && (
                <Card className="p-4 border-dashed">
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="new-document-title">Document Title</Label>
                      <Input
                        id="new-document-title"
                        value={newDocumentTitle}
                        onChange={(e) => setNewDocumentTitle(e.target.value)}
                        placeholder="Enter document title..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") createDocument()
                          if (e.key === "Escape") setShowNewDocumentForm(false)
                        }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={createDocument}
                        disabled={isCreating}
                        size="sm"
                      >
                        {isCreating ? "Creating..." : "Create"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowNewDocumentForm(false)}
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
              
              {/* Document List */}
              <div className="space-y-2">
                {documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No documents yet. Create your first document to get started.
                  </p>
                ) : (
                  documents.map((doc) => (
                    <div
                      key={doc.id}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-colors",
                        currentDocument?.id === doc.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                      onClick={() => setCurrentDocument(doc)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">
                            {doc.title}
                          </h3>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <FileEdit className="h-3 w-3" />
                              {doc.wordCount} words
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(doc.lastEditedAt)}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteDocument(doc.id)
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Editor Area */}
        <div className="lg:col-span-3">
          {currentDocument ? (
            <div className="space-y-4">
              {/* Document Header with Readability Score */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <Card className="lg:col-span-3">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold">{currentDocument.title}</h2>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileEdit className="h-4 w-4" />
                            {currentDocument.wordCount} words
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Last edited {formatTime(currentDocument.lastEditedAt)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {currentDocument.characterCount} characters
                        </Badge>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Document</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{currentDocument.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteDocument(currentDocument.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete Document
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Readability Score Box */}
                <div className="lg:col-span-1">
                  <ReadabilityScore 
                    metrics={readabilityMetrics} 
                    isLoading={isAnalyzingReadability}
                  />
                </div>
              </div>
              
              {/* Editor */}
              <div className="relative">
                {/* Sidebar Toggle Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 z-20"
                  onClick={() => setIsGrammarSidebarOpen((open) => !open)}
                  aria-label={isGrammarSidebarOpen ? "Hide Grammar Assistant" : "Show Grammar Assistant"}
                >
                  {isGrammarSidebarOpen ? <ChevronRight className="size-5" /> : <ChevronLeft className="size-5" />}
                </Button>
                <TipTapEditor
                  content={currentDocument.content}
                  onSave={saveDocument}
                  documentId={currentDocument.id}
                  placeholder="Start writing your document..."
                  grammarSidebarOpen={isGrammarSidebarOpen}
                  onManualSave={handleManualSave}
                />
              </div>
            </div>
          ) : (
            <Card className="flex items-center justify-center p-12">
              <div className="text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Document Selected</h3>
                <p className="text-muted-foreground mb-4">
                  Select a document from the sidebar or create a new one to start writing.
                </p>
                <Button onClick={() => setShowNewDocumentForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Document
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

// Utility function for debouncing
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