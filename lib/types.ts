export interface Document {
  id: string
  title: string
  content: string
  embedding?: number[]
  created_at: string
  file_type?: 'text' | 'pdf' | 'docx'
  file_size?: number
  page_count?: number
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  sources?: Source[]
  searchQuery?: string
}

export interface SearchResult {
  document: Document
  similarity: number
  score: number
  type: 'dense' | 'sparse' | 'hybrid'
}

export interface Source {
  id: string
  title: string
  url: string
  snippet: string
  domain: string
  type: 'document' | 'web' | 'news' | 'knowledge_graph' | 'answer_box'
  credibilityScore: number
  relevanceScore: number
  publishDate?: string
  citation: string
}

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

export interface HybridSearchResult {
  documentResults: SearchResult[]
  webResults: WebSearchResult[]
  combinedScore: number
  sources: Source[]
  searchTime: number
  totalResults: number
}

export interface RetrievalMethod {
  type: 'dense' | 'sparse' | 'hybrid' | 'web_only' | 'documents_only'
  enabled: boolean
  weight: number
}

export interface SearchConfig {
  methods: RetrievalMethod[]
  includeWeb: boolean
  includeNews: boolean
  maxDocuments: number
  maxWebResults: number
  similarityThreshold: number
  location?: string
}

export interface QualityMetrics {
  relevanceScore: number
  credibilityScore: number
  sourceCount: number
  responseTime: number
  userRating?: number
  citations: number
}
