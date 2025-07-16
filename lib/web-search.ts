import axios from 'axios'

const SERPSTACK_API_KEY = process.env.SERPSTACK_API_KEY!
const SERPSTACK_BASE_URL = 'https://api.serpstack.com/search'

export interface WebSearchResult {
  id: string
  title: string
  url: string
  snippet: string
  domain: string
  type: 'organic' | 'news' | 'knowledge_graph' | 'answer_box'
  credibilityScore: number
  publishDate?: string
  source?: string
  relevanceScore: number
}

export interface SearchResponse {
  results: WebSearchResult[]
  totalResults: number
  searchTime: number
  relatedQueries: string[]
  knowledgeGraph?: {
    title: string
    description: string
    website?: string
    type?: string
  }
}

class WebSearchService {
  private async makeRequest(query: string, options: {
    type?: 'web' | 'news'
    location?: string
    num?: number
  } = {}): Promise<any> {
    const params = {
      access_key: SERPSTACK_API_KEY,
      query,
      type: options.type === 'news' ? 'news' : 'web',
      num: options.num || 10,
      location: options.location,
      gl: 'us',
      hl: 'en',
      safe: 0
    }

    try {
      const response = await axios.get(SERPSTACK_BASE_URL, { 
        params,
        timeout: 10000
      })
      
      if (response.data.error) {
        throw new Error(`Serpstack API Error: ${response.data.error.info}`)
      }
      
      return response.data
    } catch (error) {
      console.error('Web search error:', error)
      throw new Error('Failed to fetch web search results')
    }
  }

  private calculateCredibilityScore(domain: string, hasKnowledgeGraph: boolean = false): number {
    // Basic credibility scoring based on domain reputation
    const highCredibilityDomains = [
      'wikipedia.org', 'britannica.com', 'reuters.com', 'bbc.com', 
      'apnews.com', 'nature.com', 'science.org', 'pubmed.ncbi.nlm.nih.gov',
      'arxiv.org', 'jstor.org', 'scholar.google.com'
    ]
    
    const mediumCredibilityDomains = [
      'cnn.com', 'nytimes.com', 'washingtonpost.com', 'theguardian.com',
      'wsj.com', 'techcrunch.com', 'wired.com', 'scientificamerican.com'
    ]

    if (hasKnowledgeGraph) return 0.95
    if (highCredibilityDomains.some(d => domain.includes(d))) return 0.9
    if (mediumCredibilityDomains.some(d => domain.includes(d))) return 0.75
    if (domain.includes('.edu')) return 0.85
    if (domain.includes('.gov')) return 0.8
    if (domain.includes('.org')) return 0.7
    
    return 0.5 // Default score for unknown domains
  }

  private calculateRelevanceScore(result: any, originalQuery: string): number {
    const queryTerms = originalQuery.toLowerCase().split(' ')
    const title = result.title?.toLowerCase() || ''
    const snippet = result.snippet?.toLowerCase() || ''
    
    let score = 0
    let termMatches = 0
    
    queryTerms.forEach(term => {
      if (title.includes(term)) {
        score += 0.4 // Title matches are more important
        termMatches++
      }
      if (snippet.includes(term)) {
        score += 0.2
        termMatches++
      }
    })
    
    // Boost score based on term coverage
    const termCoverage = termMatches / (queryTerms.length * 2) // *2 because we check title and snippet
    score += termCoverage * 0.4
    
    return Math.min(score, 1.0)
  }

  private processResults(data: any, query: string): WebSearchResult[] {
    const results: WebSearchResult[] = []
    
    // Process organic results
    if (data.organic_results) {
      data.organic_results.forEach((result: any, index: number) => {
        const domain = new URL(result.url).hostname
        const webResult: WebSearchResult = {
          id: `organic_${index}`,
          title: result.title,
          url: result.url,
          snippet: result.snippet || '',
          domain,
          type: 'organic',
          credibilityScore: this.calculateCredibilityScore(domain),
          relevanceScore: this.calculateRelevanceScore(result, query)
        }
        results.push(webResult)
      })
    }
    
    // Process news results
    if (data.news_results) {
      data.news_results.forEach((result: any, index: number) => {
        const domain = new URL(result.url).hostname
        const newsResult: WebSearchResult = {
          id: `news_${index}`,
          title: result.title,
          url: result.url,
          snippet: result.snippet || '',
          domain,
          type: 'news',
          source: result.source_name,
          publishDate: result.uploaded_utc,
          credibilityScore: this.calculateCredibilityScore(domain),
          relevanceScore: this.calculateRelevanceScore(result, query)
        }
        results.push(newsResult)
      })
    }
    
    // Process answer box
    if (data.answer_box?.featured_snippets) {
      data.answer_box.featured_snippets.forEach((snippet: any, index: number) => {
        const domain = new URL(snippet.link).hostname
        const answerResult: WebSearchResult = {
          id: `answer_${index}`,
          title: snippet.link_title || 'Featured Answer',
          url: snippet.link,
          snippet: snippet.value?.text || '',
          domain,
          type: 'answer_box',
          credibilityScore: this.calculateCredibilityScore(domain, true),
          relevanceScore: 1.0 // Answer boxes are highly relevant
        }
        results.push(answerResult)
      })
    }
    
    return results.sort((a, b) => {
      // Sort by combined relevance and credibility score
      const scoreA = (a.relevanceScore * 0.6) + (a.credibilityScore * 0.4)
      const scoreB = (b.relevanceScore * 0.6) + (b.credibilityScore * 0.4)
      return scoreB - scoreA
    })
  }

  async search(query: string, options: {
    includeNews?: boolean
    location?: string
    maxResults?: number
  } = {}): Promise<SearchResponse> {
    const startTime = Date.now()
    
    try {
      // Perform web search
      const webData = await this.makeRequest(query, {
        type: 'web',
        location: options.location,
        num: options.maxResults || 8
      })
      
      let results = this.processResults(webData, query)
      
      // Optionally include news results
      if (options.includeNews) {
        try {
          const newsData = await this.makeRequest(query, {
            type: 'news',
            location: options.location,
            num: 3
          })
          const newsResults = this.processResults(newsData, query)
          results = [...results, ...newsResults]
        } catch (error) {
          console.warn('Failed to fetch news results:', error)
        }
      }
      
      // Extract related searches
      const relatedQueries = webData.related_searches?.map((rs: any) => rs.text) || []
      
      // Extract knowledge graph if available
      let knowledgeGraph
      if (webData.knowledge_graph) {
        knowledgeGraph = {
          title: webData.knowledge_graph.title,
          description: webData.knowledge_graph.description,
          website: webData.knowledge_graph.website,
          type: webData.knowledge_graph.type
        }
      }
      
      return {
        results: results.slice(0, options.maxResults || 10),
        totalResults: webData.search_information?.total_results || 0,
        searchTime: Date.now() - startTime,
        relatedQueries: relatedQueries.slice(0, 5),
        knowledgeGraph
      }
    } catch (error) {
      console.error('Search failed:', error)
      throw error
    }
  }

  async searchWithFallback(query: string, options: {
    includeNews?: boolean
    location?: string
    maxResults?: number
  } = {}): Promise<SearchResponse> {
    try {
      return await this.search(query, options)
    } catch (error) {
      // Return empty results if search fails
      console.error('Web search failed, returning empty results:', error)
      return {
        results: [],
        totalResults: 0,
        searchTime: 0,
        relatedQueries: []
      }
    }
  }
}

export const webSearchService = new WebSearchService()
export default webSearchService 