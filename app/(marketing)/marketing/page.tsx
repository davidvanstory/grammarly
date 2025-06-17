/*
<ai_context>
This server page is the marketing homepage moved to /marketing route.
</ai_context>
*/

"use server"

import { FeaturesSection } from "@/components/landing/features"
import { HeroSection } from "@/components/landing/hero"

export default async function MarketingPage() {
  console.log("Marketing page accessed")
  
  return (
    <div className="pb-20">
      <HeroSection />
      {/* social proof */}
      <FeaturesSection />
      {/* pricing */}
      {/* faq */}
      {/* blog */}
      {/* footer */}
    </div>
  )
} 