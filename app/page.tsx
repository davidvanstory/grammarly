/*
<ai_context>
This server page is the new root page that handles authentication-based routing.
</ai_context>
*/

"use server"

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export default async function RootPage() {
  console.log("Root page accessed - checking authentication status")
  
  const { userId } = await auth()
  
  if (!userId) {
    console.log("User not authenticated, redirecting to login")
    redirect("/login")
  }
  
  console.log("User authenticated, redirecting to editor:", userId)
  redirect("/editor")
} 