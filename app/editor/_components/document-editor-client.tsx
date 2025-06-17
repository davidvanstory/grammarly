/*
<ai_context>
This client component provides the document editor interface with document management and TipTap editor..
</ai_context>
*/

"use client"

import { useState, useEffect } from "react"
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
  FileEdit
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

export default function DocumentEditorClient({ userId }: DocumentEditorClientProps) {
  const [documents, setDocuments] = useState<SelectDocument[]>([])
  const [currentDocument, setCurrentDocument] = useState<SelectDocument | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newDocumentTitle, setNewDocumentTitle] = useState("")
  const [showNewDocumentForm, setShowNewDocumentForm] = useState(false)
  const { toast } = useToast()

  // Load documents on mount
  useEffect(() => {
    loadDocuments()
  }, [userId])

  const loadDocuments = async () => {
    console.log("Loading documents for user:", userId)
    setIsLoading(true)
    
    try {
      const result = await getDocumentsAction(userId)
      
      if (result.isSuccess) {
        setDocuments(result.data || [])
        console.log("Documents loaded successfully:", result.data?.length || 0)
      } else {
        console.error("Failed to load documents:", result.message)
        // Set empty array to prevent infinite retries
        setDocuments([])
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error loading documents:", error)
      // Set empty array to prevent infinite retries
      setDocuments([])
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
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
      <div className="flex justify-end mb-6">
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
              {/* Document Header */}
              <Card>
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
              
              {/* Editor */}
              <TipTapEditor
                content={currentDocument.content}
                onSave={saveDocument}
                documentId={currentDocument.id}
                placeholder="Start writing your document..."
              />
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