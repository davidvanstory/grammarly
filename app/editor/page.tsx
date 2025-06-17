/*
<ai_context>
This server page provides the main document editor interface.
</ai_context>
*/

"use server"

import { Suspense } from "react"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import DocumentEditorClient from "./_components/document-editor-client"
import DocumentEditorSkeleton from "./_components/document-editor-skeleton"
import { ErrorBoundary } from "@/components/utilities/error-boundary"

export default async function EditorPage() {
  const { userId } = await auth()
  
  if (!userId) {
    console.log("User not authenticated, redirecting to login")
    redirect("/login")
  }
  
  console.log("User authenticated for editor:", userId)
  
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Document Editor</h1>
        <p className="text-muted-foreground">
          Write, edit, and improve your documents with AI-powered grammar checking and style suggestions.
        </p>
      </div>
      
      <ErrorBoundary>
        <Suspense fallback={<DocumentEditorSkeleton />}>
          <DocumentEditorClient userId={userId} />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
} 