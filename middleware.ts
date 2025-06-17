/*
<ai_context>
Contains middleware for protecting routes, checking user authentication, and redirecting as needed.
</ai_context>
*/

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

// Updated to include root route and editor route as protected
const isProtectedRoute = createRouteMatcher(["/", "/todo(.*)", "/editor(.*)"])

export default clerkMiddleware(async (auth, req) => {
  const { userId, redirectToSignIn } = await auth()
  
  console.log("Middleware processing route:", req.url, "User authenticated:", !!userId)

  // If the user isn't signed in and the route is private, redirect to sign-in
  if (!userId && isProtectedRoute(req)) {
    console.log("Unauthenticated user accessing protected route, redirecting to login")
    return redirectToSignIn({ returnBackUrl: "/login" })
  }

  // If the user is logged in and the route is protected, let them view.
  if (userId && isProtectedRoute(req)) {
    console.log("Authenticated user accessing protected route, allowing access")
    return NextResponse.next()
  }
  
  // For non-protected routes, allow access
  console.log("Non-protected route, allowing access")
  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"]
}
