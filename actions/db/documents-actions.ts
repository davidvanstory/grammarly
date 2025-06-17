/*
<ai_context>
Contains server actions related to documents.
</ai_context>
*/

"use server"

import { db } from "@/db/db"
import { InsertDocument, SelectDocument, documentsTable } from "@/db/schema"
import { ActionState } from "@/types"
import { eq, desc, sql } from "drizzle-orm"

export async function createDocumentAction(
  document: InsertDocument
): Promise<ActionState<SelectDocument>> {
  console.log("=== CREATE DOCUMENT ACTION START ===")
  console.log("Input document data:", {
    userId: document.userId,
    title: document.title,
    contentLength: document.content?.length || 0,
    wordCount: document.wordCount,
    characterCount: document.characterCount
  })
  
  try {
    console.log("🔍 Attempting database insert...")
    
    // Test database connection first
    console.log("🔍 Testing database connection...")
    const connectionTest = await db.execute(sql`SELECT 1 as test`)
    console.log("✅ Database connection test result:", connectionTest)
    
    console.log("🔍 Inserting document into database...")
    const [newDocument] = await db.insert(documentsTable).values(document).returning()
    
    console.log("✅ Document created successfully!")
    console.log("New document details:", {
      id: newDocument.id,
      userId: newDocument.userId,
      title: newDocument.title,
      createdAt: newDocument.createdAt
    })
    
    return {
      isSuccess: true,
      message: "Document created successfully",
      data: newDocument
    }
  } catch (error: any) {
    console.error("❌ ERROR CREATING DOCUMENT:")
    console.error("Error type:", typeof error)
    console.error("Error message:", error?.message)
    console.error("Error code:", error?.code)
    console.error("Error severity:", error?.severity)
    console.error("Error detail:", error?.detail)
    console.error("Error constraint:", error?.constraint)
    console.error("Full error object:", error)
    console.error("Error stack:", error?.stack)
    
    // More specific error handling
    if (error?.code === '23505') {
      console.error("❌ Unique constraint violation")
      return { isSuccess: false, message: "Document with this title already exists" }
    }
    
    if (error?.code === '23502') {
      console.error("❌ Not null constraint violation")
      return { isSuccess: false, message: "Missing required document data" }
    }
    
    if (error?.code === 'ECONNREFUSED' || error?.message?.includes('connection')) {
      console.error("❌ Database connection error")
      return { isSuccess: false, message: "Database connection failed" }
    }
    
    return { 
      isSuccess: false, 
      message: `Failed to create document: ${error?.message || 'Unknown database error'}` 
    }
  }
}

export async function getDocumentsAction(
  userId: string
): Promise<ActionState<SelectDocument[]>> {
  console.log("=== GET DOCUMENTS ACTION START ===")
  console.log("Input userId:", userId)
  
  try {
    console.log("🔍 Testing database connection...")
    const connectionTest = await db.execute(sql`SELECT 1 as test`)
    console.log("✅ Database connection test result:", connectionTest)
    
    console.log("🔍 Querying documents for user...")
    const documents = await db.query.documents.findMany({
      where: eq(documentsTable.userId, userId),
      orderBy: [desc(documentsTable.lastEditedAt)]
    })
    
    console.log(`✅ Found ${documents.length} documents for user`)
    console.log("Document IDs:", documents.map(d => d.id))
    
    return {
      isSuccess: true,
      message: "Documents retrieved successfully",
      data: documents
    }
  } catch (error: any) {
    console.error("❌ ERROR GETTING DOCUMENTS:")
    console.error("Error type:", typeof error)
    console.error("Error message:", error?.message)
    console.error("Error code:", error?.code)
    console.error("Error severity:", error?.severity)
    console.error("Error detail:", error?.detail)
    console.error("Full error object:", error)
    console.error("Error stack:", error?.stack)
    
    if (error?.code === 'ECONNREFUSED' || error?.message?.includes('connection')) {
      console.error("❌ Database connection error")
      return { isSuccess: false, message: "Database connection failed" }
    }
    
    return { 
      isSuccess: false, 
      message: `Failed to get documents: ${error?.message || 'Unknown database error'}` 
    }
  }
}

export async function getDocumentByIdAction(
  id: string,
  userId: string
): Promise<ActionState<SelectDocument>> {
  console.log("=== GET DOCUMENT BY ID ACTION START ===")
  console.log("Input data:", { id, userId })
  
  try {
    console.log("🔍 Testing database connection...")
    const connectionTest = await db.execute(sql`SELECT 1 as test`)
    console.log("✅ Database connection test result:", connectionTest)
    
    console.log("🔍 Querying document by ID...")
    const [document] = await db.query.documents.findMany({
      where: eq(documentsTable.id, id)
    })
    
    if (!document) {
      console.log("❌ Document not found:", id)
      return { isSuccess: false, message: "Document not found" }
    }
    
    if (document.userId !== userId) {
      console.log("❌ User not authorized to access document:", { documentUserId: document.userId, requestUserId: userId })
      return { isSuccess: false, message: "Not authorized to access this document" }
    }
    
    console.log("✅ Document retrieved successfully:", id)
    
    return {
      isSuccess: true,
      message: "Document retrieved successfully",
      data: document
    }
  } catch (error: any) {
    console.error("❌ ERROR GETTING DOCUMENT BY ID:")
    console.error("Error type:", typeof error)
    console.error("Error message:", error?.message)
    console.error("Error code:", error?.code)
    console.error("Full error object:", error)
    
    return { 
      isSuccess: false, 
      message: `Failed to get document: ${error?.message || 'Unknown database error'}` 
    }
  }
}

export async function updateDocumentAction(
  id: string,
  userId: string,
  data: Partial<InsertDocument>
): Promise<ActionState<SelectDocument>> {
  console.log("=== UPDATE DOCUMENT ACTION START ===")
  console.log("Input data:", { id, userId, updateData: data })
  
  try {
    console.log("🔍 Testing database connection...")
    const connectionTest = await db.execute(sql`SELECT 1 as test`)
    console.log("✅ Database connection test result:", connectionTest)
    
    console.log("🔍 Verifying document ownership...")
    const [existingDocument] = await db.query.documents.findMany({
      where: eq(documentsTable.id, id)
    })
    
    if (!existingDocument) {
      console.log("❌ Document not found:", id)
      return { isSuccess: false, message: "Document not found" }
    }
    
    if (existingDocument.userId !== userId) {
      console.log("❌ User not authorized to update document:", { documentUserId: existingDocument.userId, requestUserId: userId })
      return { isSuccess: false, message: "Not authorized to update this document" }
    }
    
    console.log("🔍 Updating document...")
    const [updatedDocument] = await db
      .update(documentsTable)
      .set({
        ...data,
        updatedAt: new Date(),
        lastEditedAt: new Date()
      })
      .where(eq(documentsTable.id, id))
      .returning()

    console.log("✅ Document updated successfully:", id)
    
    return {
      isSuccess: true,
      message: "Document updated successfully",
      data: updatedDocument
    }
  } catch (error: any) {
    console.error("❌ ERROR UPDATING DOCUMENT:")
    console.error("Error type:", typeof error)
    console.error("Error message:", error?.message)
    console.error("Error code:", error?.code)
    console.error("Full error object:", error)
    
    return { 
      isSuccess: false, 
      message: `Failed to update document: ${error?.message || 'Unknown database error'}` 
    }
  }
}

export async function deleteDocumentAction(
  id: string,
  userId: string
): Promise<ActionState<void>> {
  console.log("=== DELETE DOCUMENT ACTION START ===")
  console.log("Input data:", { id, userId })
  
  try {
    console.log("🔍 Testing database connection...")
    const connectionTest = await db.execute(sql`SELECT 1 as test`)
    console.log("✅ Database connection test result:", connectionTest)
    
    console.log("🔍 Verifying document ownership...")
    const [existingDocument] = await db.query.documents.findMany({
      where: eq(documentsTable.id, id)
    })
    
    if (!existingDocument) {
      console.log("❌ Document not found:", id)
      return { isSuccess: false, message: "Document not found" }
    }
    
    if (existingDocument.userId !== userId) {
      console.log("❌ User not authorized to delete document:", { documentUserId: existingDocument.userId, requestUserId: userId })
      return { isSuccess: false, message: "Not authorized to delete this document" }
    }
    
    console.log("🔍 Deleting document...")
    await db.delete(documentsTable).where(eq(documentsTable.id, id))
    
    console.log("✅ Document deleted successfully:", id)
    
    return {
      isSuccess: true,
      message: "Document deleted successfully",
      data: undefined
    }
  } catch (error: any) {
    console.error("❌ ERROR DELETING DOCUMENT:")
    console.error("Error type:", typeof error)
    console.error("Error message:", error?.message)
    console.error("Error code:", error?.code)
    console.error("Full error object:", error)
    
    return { 
      isSuccess: false, 
      message: `Failed to delete document: ${error?.message || 'Unknown database error'}` 
    }
  }
} 