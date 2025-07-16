import { NextResponse } from "next/server"
import { webSearchService } from "@/lib/web-search"

export async function POST(req: Request) {
  try {
    const { query, options = {} } = await req.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: "Search query is required" }, 
        { status: 400 }
      )
    }

    // Default search options
    const searchOptions = {
      includeNews: options.includeNews ?? true,
      location: options.location,
      maxResults: options.maxResults ?? 8
    }

    const results = await webSearchService.searchWithFallback(query, searchOptions)

    return NextResponse.json({
      success: true,
      ...results
    })

  } catch (error) {
    console.error("Error in web search API:", error)
    return NextResponse.json(
      { 
        error: "Failed to perform web search",
        success: false,
        results: [],
        totalResults: 0,
        searchTime: 0,
        relatedQueries: []
      }, 
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('query')
  const includeNews = searchParams.get('includeNews') === 'true'
  const location = searchParams.get('location')
  const maxResults = parseInt(searchParams.get('maxResults') || '8')

  if (!query) {
    return NextResponse.json(
      { error: "Search query is required" }, 
      { status: 400 }
    )
  }

  try {
    const results = await webSearchService.searchWithFallback(query, {
      includeNews,
      location: location || undefined,
      maxResults
    })

    return NextResponse.json({
      success: true,
      ...results
    })

  } catch (error) {
    console.error("Error in web search API:", error)
    return NextResponse.json(
      { 
        error: "Failed to perform web search",
        success: false,
        results: [],
        totalResults: 0,
        searchTime: 0,
        relatedQueries: []
      }, 
      { status: 500 }
    )
  }
} 