/*
<ai_context>
Contains server actions related to writing samples.
</ai_context>
*/

"use server"

import { db } from "@/db/db"
import { InsertWritingSample, SelectWritingSample, writingSamplesTable } from "@/db/schema"
import { ActionState } from "@/types"
import { eq, desc } from "drizzle-orm"

export async function createWritingSampleAction(
  writingSample: InsertWritingSample
): Promise<ActionState<SelectWritingSample>> {
  try {
    console.log("Creating writing sample for user:", writingSample.userId)
    
    const [newWritingSample] = await db.insert(writingSamplesTable).values(writingSample).returning()
    
    console.log("Writing sample created successfully:", newWritingSample.id)
    
    return {
      isSuccess: true,
      message: "Writing sample created successfully",
      data: newWritingSample
    }
  } catch (error) {
    console.error("Error creating writing sample:", error)
    return { isSuccess: false, message: "Failed to create writing sample" }
  }
}

export async function getWritingSamplesAction(
  userId: string
): Promise<ActionState<SelectWritingSample[]>> {
  try {
    console.log("Fetching writing samples for user:", userId)
    
    const writingSamples = await db.query.writingSamples.findMany({
      where: eq(writingSamplesTable.userId, userId),
      orderBy: [desc(writingSamplesTable.createdAt)]
    })
    
    console.log(`Found ${writingSamples.length} writing samples for user`)
    
    return {
      isSuccess: true,
      message: "Writing samples retrieved successfully",
      data: writingSamples
    }
  } catch (error) {
    console.error("Error getting writing samples:", error)
    return { isSuccess: false, message: "Failed to get writing samples" }
  }
}

export async function getWritingSampleByIdAction(
  id: string,
  userId: string
): Promise<ActionState<SelectWritingSample>> {
  try {
    console.log("Fetching writing sample:", id, "for user:", userId)
    
    const [writingSample] = await db.query.writingSamples.findMany({
      where: eq(writingSamplesTable.id, id)
    })
    
    if (!writingSample) {
      console.log("Writing sample not found:", id)
      return { isSuccess: false, message: "Writing sample not found" }
    }
    
    if (writingSample.userId !== userId) {
      console.log("User not authorized to access writing sample:", id)
      return { isSuccess: false, message: "Not authorized to access this writing sample" }
    }
    
    console.log("Writing sample retrieved successfully:", id)
    
    return {
      isSuccess: true,
      message: "Writing sample retrieved successfully",
      data: writingSample
    }
  } catch (error) {
    console.error("Error getting writing sample:", error)
    return { isSuccess: false, message: "Failed to get writing sample" }
  }
}

export async function updateWritingSampleAction(
  id: string,
  userId: string,
  data: Partial<InsertWritingSample>
): Promise<ActionState<SelectWritingSample>> {
  try {
    console.log("Updating writing sample:", id, "for user:", userId)
    
    // Verify ownership
    const [existingWritingSample] = await db.query.writingSamples.findMany({
      where: eq(writingSamplesTable.id, id)
    })
    
    if (!existingWritingSample) {
      console.log("Writing sample not found:", id)
      return { isSuccess: false, message: "Writing sample not found" }
    }
    
    if (existingWritingSample.userId !== userId) {
      console.log("User not authorized to update writing sample:", id)
      return { isSuccess: false, message: "Not authorized to update this writing sample" }
    }
    
    const [updatedWritingSample] = await db
      .update(writingSamplesTable)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(writingSamplesTable.id, id))
      .returning()

    console.log("Writing sample updated successfully:", id)
    
    return {
      isSuccess: true,
      message: "Writing sample updated successfully",
      data: updatedWritingSample
    }
  } catch (error) {
    console.error("Error updating writing sample:", error)
    return { isSuccess: false, message: "Failed to update writing sample" }
  }
}

export async function deleteWritingSampleAction(
  id: string,
  userId: string
): Promise<ActionState<void>> {
  try {
    console.log("Deleting writing sample:", id, "for user:", userId)
    
    // Verify ownership
    const [existingWritingSample] = await db.query.writingSamples.findMany({
      where: eq(writingSamplesTable.id, id)
    })
    
    if (!existingWritingSample) {
      console.log("Writing sample not found:", id)
      return { isSuccess: false, message: "Writing sample not found" }
    }
    
    if (existingWritingSample.userId !== userId) {
      console.log("User not authorized to delete writing sample:", id)
      return { isSuccess: false, message: "Not authorized to delete this writing sample" }
    }
    
    await db.delete(writingSamplesTable).where(eq(writingSamplesTable.id, id))
    
    console.log("Writing sample deleted successfully:", id)
    
    return {
      isSuccess: true,
      message: "Writing sample deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting writing sample:", error)
    return { isSuccess: false, message: "Failed to delete writing sample" }
  }
} 