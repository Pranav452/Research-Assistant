import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Check if environment variables are set
    const hasSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
    const hasGoogleAI = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY
    const hasSerpstack = !!process.env.SERPSTACK_API_KEY

    // Test a simple web search
    let searchTest = null
    if (hasSerpstack) {
      try {
        const response = await fetch(`https://api.serpstack.com/search?access_key=${process.env.SERPSTACK_API_KEY}&query=test&num=1`)
        const data = await response.json()
        searchTest = {
          success: !data.error,
          error: data.error?.info || null,
          resultsCount: data.organic_results?.length || 0
        }
      } catch (error) {
        searchTest = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        }
      }
    }

    return NextResponse.json({
      environment: {
        supabase: hasSupabase,
        googleAI: hasGoogleAI,
        serpstack: hasSerpstack
      },
      searchTest,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("Test API error:", error)
    return NextResponse.json(
      { error: "Test failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
} 