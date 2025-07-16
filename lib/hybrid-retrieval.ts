import { createClient } from "@supabase/supabase-js"
import { generateEmbedding } from "./embeddings"
import { webSearchService } from "./web-search"
import type { 
  SearchResult, 
  WebSearchResult, 
  HybridSearchResult, 
  Source, 
  SearchConfig,
  Document
} from "./types"
import Fuse from 'fuse.js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)

export class HybridRetrieval {
  private defaultConfig: SearchConfig = {
    methods: [
      { type: 'dense', enabled: true, weight: 0.4 },
      { type: 'sparse', enabled: true, weight: 0.3 },
      { type: 'web_only', enabled: true, weight: 0.3 }
    ],
    includeWeb: true,
    includeNews: true,
    maxDocuments: 5,
    maxWebResults: 5,
    similarityThreshold: 0.6
  }

  /**
   * Dense retrieval using vector similarity search
   */
  private async denseRetrieval(query: string, maxResults: number = 5, threshold: number = 0.6): Promise<SearchResult[]> {
    try {
      const queryEmbedding = await generateEmbedding(query)
      
      const { data: documents, error } = await supabase.rpc("match_documents", {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: maxResults,
      })

      if (error) {
        console.error("Dense retrieval error:", error)
        return []
      }

      return documents?.map((doc: any) => ({
        document: {
          id: doc.id,
          title: doc.title,
          content: doc.content,
          created_at: doc.created_at
        } as Document,
        similarity: doc.similarity,
        score: doc.similarity,
        type: 'dense' as const
      })) || []
    } catch (error) {
      console.error("Dense retrieval failed:", error)
      return []
    }
  }

  /**
   * Sparse retrieval using keyword matching
   */
  private async sparseRetrieval(query: string, maxResults: number = 5): Promise<SearchResult[]> {
    try {
      // Fetch all documents for sparse search
      const { data: documents, error } = await supabase
        .from("documents")
        .select("id, title, content, created_at")
        .order("created_at", { ascending: false })

      if (error || !documents) {
        console.error("Sparse retrieval error:", error)
        return []
      }

      // Use Fuse.js for fuzzy text search
      const fuse = new Fuse(documents, {
        keys: [
          { name: 'title', weight: 0.7 },
          { name: 'content', weight: 0.3 }
        ],
        threshold: 0.4,
        includeScore: true,
        minMatchCharLength: 2
      })

      const results = fuse.search(query, { limit: maxResults })
      
      return results.map((result, index) => ({
        document: {
          id: result.item.id,
          title: result.item.title,
          content: result.item.content,
          created_at: result.item.created_at
        } as Document,
        similarity: 1 - (result.score || 0), // Convert Fuse score to similarity
        score: 1 - (result.score || 0),
        type: 'sparse' as const
      }))
    } catch (error) {
      console.error("Sparse retrieval failed:", error)
      return []
    }
  }

  /**
   * Combine and re-rank dense and sparse results
   */
  private combineResults(
    denseResults: SearchResult[], 
    sparseResults: SearchResult[],
    denseWeight: number = 0.6,
    sparseWeight: number = 0.4
  ): SearchResult[] {
    const combinedMap = new Map<string, SearchResult>()
    
    // Process dense results
    denseResults.forEach(result => {
      combinedMap.set(result.document.id, {
        ...result,
        score: result.score * denseWeight,
        type: 'hybrid' as const
      })
    })
    
    // Process sparse results and combine scores
    sparseResults.forEach(result => {
      const existing = combinedMap.get(result.document.id)
      if (existing) {
        // Combine scores for documents found in both
        existing.score = existing.score + (result.score * sparseWeight)
      } else {
        // Add new sparse-only results
        combinedMap.set(result.document.id, {
          ...result,
          score: result.score * sparseWeight,
          type: 'hybrid' as const
        })
      }
    })
    
    // Sort by combined score and return
    return Array.from(combinedMap.values())
      .sort((a, b) => b.score - a.score)
  }

  /**
   * Convert search results to sources
   */
  private documentsToSources(results: SearchResult[]): Source[] {
    return results.map((result, index) => ({
      id: result.document.id,
      title: result.document.title,
      url: `#document-${result.document.id}`,
      snippet: result.document.content.substring(0, 300) + "...",
      domain: "local-documents",
      type: 'document' as const,
      credibilityScore: 0.8, // Local documents have high credibility
      relevanceScore: result.score,
      citation: `[${index + 1}] ${result.document.title}`
    }))
  }

  /**
   * Convert web results to sources
   */
  private webResultsToSources(results: WebSearchResult[], startIndex: number = 0): Source[] {
    return results.map((result, index) => ({
      id: result.id,
      title: result.title,
      url: result.url,
      snippet: result.snippet,
      domain: result.domain,
      type: result.type === 'organic' ? 'web' as const : result.type as any,
      credibilityScore: result.credibilityScore,
      relevanceScore: result.relevanceScore,
      publishDate: result.publishDate,
      citation: `[${startIndex + index + 1}] ${result.title} - ${result.domain}`
    }))
  }

  /**
   * Main hybrid search function
   */
  async search(query: string, config: Partial<SearchConfig> = {}): Promise<HybridSearchResult> {
    const searchConfig = { ...this.defaultConfig, ...config }
    const startTime = Date.now()
    
    const results: {
      documentResults: SearchResult[]
      webResults: WebSearchResult[]
    } = {
      documentResults: [],
      webResults: []
    }

    try {
      // Parallel execution of different retrieval methods
      const promises: Promise<any>[] = []
      
      // Document retrieval
      const denseEnabled = searchConfig.methods.find(m => m.type === 'dense')?.enabled
      const sparseEnabled = searchConfig.methods.find(m => m.type === 'sparse')?.enabled
      const webEnabled = searchConfig.methods.find(m => m.type === 'web_only')?.enabled
      
      if (denseEnabled || sparseEnabled) {
        if (denseEnabled) {
          promises.push(
            this.denseRetrieval(query, searchConfig.maxDocuments, searchConfig.similarityThreshold)
              .then(results => ({ type: 'dense', results }))
          )
        }
        
        if (sparseEnabled) {
          promises.push(
            this.sparseRetrieval(query, searchConfig.maxDocuments)
              .then(results => ({ type: 'sparse', results }))
          )
        }
      }
      
      // Web search
      if (webEnabled && searchConfig.includeWeb) {
        promises.push(
          webSearchService.searchWithFallback(query, {
            includeNews: searchConfig.includeNews,
            maxResults: searchConfig.maxWebResults,
            location: searchConfig.location
          }).then(response => ({ type: 'web', results: response.results }))
        )
      }
      
      // Execute all searches in parallel
      const searchResults = await Promise.allSettled(promises)
      
      let denseResults: SearchResult[] = []
      let sparseResults: SearchResult[] = []
      
      searchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          const { type, results: data } = result.value
          
          switch (type) {
            case 'dense':
              denseResults = data
              break
            case 'sparse':
              sparseResults = data
              break
            case 'web':
              results.webResults = data
              break
          }
        }
      })
      
      // Combine document results if both dense and sparse are enabled
      if (denseEnabled && sparseEnabled) {
        const denseWeight = searchConfig.methods.find(m => m.type === 'dense')?.weight || 0.6
        const sparseWeight = searchConfig.methods.find(m => m.type === 'sparse')?.weight || 0.4
        results.documentResults = this.combineResults(denseResults, sparseResults, denseWeight, sparseWeight)
      } else if (denseEnabled) {
        results.documentResults = denseResults
      } else if (sparseEnabled) {
        results.documentResults = sparseResults
      }
      
      // Limit results
      results.documentResults = results.documentResults.slice(0, searchConfig.maxDocuments)
      results.webResults = results.webResults.slice(0, searchConfig.maxWebResults)
      
      // Calculate combined score
      const avgDocScore = results.documentResults.length > 0 
        ? results.documentResults.reduce((sum, r) => sum + r.score, 0) / results.documentResults.length 
        : 0
      const avgWebScore = results.webResults.length > 0
        ? results.webResults.reduce((sum, r) => sum + r.relevanceScore, 0) / results.webResults.length
        : 0
      
      const combinedScore = (avgDocScore + avgWebScore) / 2
      
      // Create unified sources list
      const documentSources = this.documentsToSources(results.documentResults)
      const webSources = this.webResultsToSources(results.webResults, documentSources.length)
      const allSources = [...documentSources, ...webSources]
      
      return {
        documentResults: results.documentResults,
        webResults: results.webResults,
        combinedScore,
        sources: allSources,
        searchTime: Date.now() - startTime,
        totalResults: results.documentResults.length + results.webResults.length
      }
      
    } catch (error) {
      console.error("Hybrid search failed:", error)
      return {
        documentResults: [],
        webResults: [],
        combinedScore: 0,
        sources: [],
        searchTime: Date.now() - startTime,
        totalResults: 0
      }
    }
  }

  /**
   * Search only documents
   */
  async searchDocuments(query: string, maxResults: number = 5): Promise<HybridSearchResult> {
    return this.search(query, {
      methods: [
        { type: 'dense', enabled: true, weight: 0.6 },
        { type: 'sparse', enabled: true, weight: 0.4 }
      ],
      includeWeb: false,
      maxDocuments: maxResults,
      maxWebResults: 0
    })
  }

  /**
   * Search only web
   */
  async searchWeb(query: string, maxResults: number = 8): Promise<HybridSearchResult> {
    return this.search(query, {
      methods: [
        { type: 'web_only', enabled: true, weight: 1.0 }
      ],
      includeWeb: true,
      includeNews: true,
      maxDocuments: 0,
      maxWebResults: maxResults
    })
  }
}

export const hybridRetrieval = new HybridRetrieval()
export default hybridRetrieval 