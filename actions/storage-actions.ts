/*
<ai_context>
Contains server actions related to file storage.
</ai_context>
*/

"use server"

import { createServerSupabaseClient } from "@/lib/supabase"
import { ActionState } from "@/types"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TEXT_TYPES = ["text/plain", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]

export async function uploadWritingSampleStorage(
  userId: string,
  file: File,
  title: string
): Promise<ActionState<{ path: string; url: string }>> {
  try {
    console.log("Uploading writing sample for user:", userId, "File:", file.name)
    
    // Validate file
    if (file.size > MAX_FILE_SIZE) {
      console.log("File size exceeds limit:", file.size)
      return { isSuccess: false, message: "File size exceeds 10MB limit" }
    }
    
    if (!ALLOWED_TEXT_TYPES.includes(file.type)) {
      console.log("File type not allowed:", file.type)
      return { isSuccess: false, message: "Only .txt, .pdf, and .docx files are allowed" }
    }
    
    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const fileExtension = file.name.split(".").pop()
    const filename = `${title}-${timestamp}.${fileExtension}`
    const path = `writing-samples/${userId}/${filename}`
    
    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    
    const supabase = createServerSupabaseClient()
    
    const { data, error } = await supabase.storage
      .from("writing-samples")
      .upload(path, uint8Array, {
        contentType: file.type,
        upsert: false
      })
    
    if (error) {
      console.error("Supabase upload error:", error)
      throw error
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from("writing-samples")
      .getPublicUrl(path)
    
    console.log("Writing sample uploaded successfully:", path)
    
    return {
      isSuccess: true,
      message: "Writing sample uploaded successfully",
      data: { path: data.path, url: urlData.publicUrl }
    }
  } catch (error) {
    console.error("Error uploading writing sample:", error)
    return { isSuccess: false, message: "Failed to upload writing sample" }
  }
}

export async function deleteWritingSampleStorage(
  path: string
): Promise<ActionState<void>> {
  try {
    console.log("Deleting writing sample from storage:", path)
    
    const supabase = createServerSupabaseClient()
    
    const { error } = await supabase.storage
      .from("writing-samples")
      .remove([path])
    
    if (error) {
      console.error("Supabase delete error:", error)
      throw error
    }
    
    console.log("Writing sample deleted from storage successfully:", path)
    
    return {
      isSuccess: true,
      message: "Writing sample deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting writing sample from storage:", error)
    return { isSuccess: false, message: "Failed to delete writing sample from storage" }
  }
}

export async function getWritingSampleUrlStorage(
  path: string
): Promise<ActionState<{ url: string }>> {
  try {
    console.log("Getting writing sample URL:", path)
    
    const supabase = createServerSupabaseClient()
    
    const { data } = await supabase.storage
      .from("writing-samples")
      .getPublicUrl(path)
    
    console.log("Writing sample URL retrieved successfully:", path)
    
    return {
      isSuccess: true,
      message: "Writing sample URL retrieved successfully",
      data: { url: data.publicUrl }
    }
  } catch (error) {
    console.error("Error getting writing sample URL:", error)
    return { isSuccess: false, message: "Failed to get writing sample URL" }
  }
} 