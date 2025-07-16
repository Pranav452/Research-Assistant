import { streamText } from "ai"
import { google } from "@ai-sdk/google"
import { hybridRetrieval } from "@/lib/hybrid-retrieval"
import type { Source } from "@/lib/types"

export async function POST(req: Request) {
  try {
    const { messages, searchConfig = {} } = await req.json()
    const lastMessage = messages[messages.length - 1]
    const query = lastMessage.content

    // Perform hybrid search (documents + web)
    const searchResults = await hybridRetrieval.search(query, {
      includeWeb: searchConfig.includeWeb ?? true,
      includeNews: searchConfig.includeNews ?? true,
      maxDocuments: searchConfig.maxDocuments ?? 4,
      maxWebResults: searchConfig.maxWebResults ?? 6,
      similarityThreshold: searchConfig.similarityThreshold ?? 0.6,
      ...searchConfig
    })

    // Format sources for context
    const formatSources = (sources: Source[]): string => {
      if (sources.length === 0) return "No relevant sources found."
      
      return sources.map((source, index) => {
        const credibilityBadge = source.credibilityScore > 0.8 ? "[HIGH CREDIBILITY]" : 
                               source.credibilityScore > 0.6 ? "[MEDIUM CREDIBILITY]" : "[LOW CREDIBILITY]"
        
        const sourceType = source.type === 'document' ? "[DOCUMENT]" : 
                          source.type === 'news' ? "[NEWS]" : 
                          source.type === 'knowledge_graph' ? "[KNOWLEDGE GRAPH]" :
                          source.type === 'answer_box' ? "[FEATURED ANSWER]" : "[WEB]"
        
        return `${source.citation} ${sourceType} ${credibilityBadge}
Title: ${source.title}
${source.url !== `#document-${source.id}` ? `URL: ${source.url}` : ''}
Content: ${source.snippet}
${source.publishDate ? `Published: ${source.publishDate}` : ''}`
      }).join("\n\n---\n\n")
    }

    const context = formatSources(searchResults.sources)
    
    // Enhanced system prompt for research assistant
    const systemPrompt = `You are a Research Assistant AI that helps users find comprehensive, accurate information by combining local documents with real-time web search results.

CONTEXT SOURCES:
${context}

INSTRUCTIONS:
1. SYNTHESIS: Combine information from multiple sources to provide comprehensive answers
2. CITATIONS: Always cite sources using the provided citation format [1], [2], etc.
3. CREDIBILITY: Give priority to high-credibility sources (marked as HIGH CREDIBILITY)
4. COMPLETENESS: If documents lack current information, supplement with web sources
5. TRANSPARENCY: Clearly indicate when information comes from local documents vs. web sources
6. RECENCY: Note publication dates when discussing time-sensitive topics
7. LIMITATIONS: Acknowledge gaps in available information
8. VERIFICATION: When possible, cross-reference claims across multiple sources

RESPONSE FORMAT:
- Start with a clear, direct answer
- Support with evidence from cited sources
- Include relevant details and context
- End with source summary if helpful

Remember: You are a research assistant, not just a document Q&A system. Provide scholarly, well-researched responses that demonstrate critical thinking and source evaluation.

Search Performance: Found ${searchResults.totalResults} sources in ${searchResults.searchTime}ms
Credibility Score: ${searchResults.sources.length > 0 ? 
  (searchResults.sources.reduce((sum, s) => sum + s.credibilityScore, 0) / searchResults.sources.length * 100).toFixed(1) : 0}%`

    const result = await streamText({
      model: google("gemini-1.5-flash"),
      system: systemPrompt,
      messages,
      temperature: 0.3, // Lower temperature for more focused research responses
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error("Error in chat API:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}
