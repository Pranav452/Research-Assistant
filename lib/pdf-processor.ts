// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdf = require('pdf-parse')
import mammoth from 'mammoth'
import type { Document } from './types'

export interface ProcessedDocument {
  title: string
  content: string
  metadata: {
    fileType: 'pdf' | 'docx' | 'txt'
    fileSize: number
    pageCount?: number
    wordCount: number
    extractedAt: string
  }
}

export interface ProcessingOptions {
  maxContentLength?: number
  chunkSize?: number
  preserveFormatting?: boolean
}

class DocumentProcessor {
  private readonly defaultOptions: ProcessingOptions = {
    maxContentLength: 50000, // Limit content to 50k chars
    chunkSize: 1000,
    preserveFormatting: false
  }

  /**
   * Process PDF files
   */
  async processPDF(buffer: Buffer, filename: string, options: ProcessingOptions = {}): Promise<ProcessedDocument> {
    try {
      const opts = { ...this.defaultOptions, ...options }
      
      const data = await pdf(buffer, {
        // PDF parse options
        max: opts.maxContentLength || 50000,
        version: '1.10.100'
      })

      // Clean and normalize the extracted text
      const cleanedText = this.cleanText(data.text)
      
      // Truncate if too long
      const content = cleanedText.length > (opts.maxContentLength || 50000) 
        ? cleanedText.substring(0, opts.maxContentLength || 50000) + '...'
        : cleanedText

      return {
        title: this.extractTitle(filename, content),
        content,
        metadata: {
          fileType: 'pdf',
          fileSize: buffer.length,
          pageCount: data.numpages,
          wordCount: this.countWords(content),
          extractedAt: new Date().toISOString()
        }
      }
    } catch (error) {
      console.error('PDF processing error:', error)
      throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Process DOCX files
   */
  async processDOCX(buffer: Buffer, filename: string, options: ProcessingOptions = {}): Promise<ProcessedDocument> {
    try {
      const opts = { ...this.defaultOptions, ...options }
      
      const result = await mammoth.extractRawText({ buffer })
      const cleanedText = this.cleanText(result.value)
      
      // Truncate if too long
      const content = cleanedText.length > (opts.maxContentLength || 50000)
        ? cleanedText.substring(0, opts.maxContentLength || 50000) + '...'
        : cleanedText

      return {
        title: this.extractTitle(filename, content),
        content,
        metadata: {
          fileType: 'docx',
          fileSize: buffer.length,
          wordCount: this.countWords(content),
          extractedAt: new Date().toISOString()
        }
      }
    } catch (error) {
      console.error('DOCX processing error:', error)
      throw new Error(`Failed to process DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Process plain text files
   */
  async processText(content: string, filename: string, options: ProcessingOptions = {}): Promise<ProcessedDocument> {
    try {
      const opts = { ...this.defaultOptions, ...options }
      
      const cleanedText = this.cleanText(content)
      
      // Truncate if too long
      const processedContent = cleanedText.length > (opts.maxContentLength || 50000)
        ? cleanedText.substring(0, opts.maxContentLength || 50000) + '...'
        : cleanedText

      return {
        title: this.extractTitle(filename, processedContent),
        content: processedContent,
        metadata: {
          fileType: 'txt',
          fileSize: new Blob([content]).size,
          wordCount: this.countWords(processedContent),
          extractedAt: new Date().toISOString()
        }
      }
    } catch (error) {
      console.error('Text processing error:', error)
      throw new Error(`Failed to process text: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Main processing function that detects file type and processes accordingly
   */
  async processFile(
    file: File | Buffer, 
    filename?: string, 
    options: ProcessingOptions = {}
  ): Promise<ProcessedDocument> {
    const fileName = filename || (file instanceof File ? file.name : 'unknown')
    const fileExtension = fileName.toLowerCase().split('.').pop()
    
    let buffer: Buffer
    if (file instanceof File) {
      buffer = Buffer.from(await file.arrayBuffer())
    } else {
      buffer = file
    }

    switch (fileExtension) {
      case 'pdf':
        return this.processPDF(buffer, fileName, options)
      
      case 'docx':
        return this.processDOCX(buffer, fileName, options)
      
      case 'txt':
      case 'md':
        const textContent = buffer.toString('utf-8')
        return this.processText(textContent, fileName, options)
      
      default:
        // Try to process as text if unknown type
        try {
          const textContent = buffer.toString('utf-8')
          return this.processText(textContent, fileName, options)
        } catch {
          throw new Error(`Unsupported file type: ${fileExtension}`)
        }
    }
  }

  /**
   * Clean and normalize extracted text
   */
  private cleanText(text: string): string {
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove control characters but keep line breaks
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Clean up multiple line breaks
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // Trim whitespace
      .trim()
  }

  /**
   * Extract a meaningful title from filename or content
   */
  private extractTitle(filename: string, content: string): string {
    // Try to extract title from filename first
    const baseFilename = filename.replace(/\.[^/.]+$/, '') // Remove extension
    
    if (baseFilename && baseFilename !== 'unknown') {
      return baseFilename
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase()) // Title case
    }

    // Try to extract from content - look for first line that might be a title
    const lines = content.split('\n').filter(line => line.trim())
    if (lines.length > 0) {
      const firstLine = lines[0].trim()
      if (firstLine.length > 5 && firstLine.length < 100) {
        return firstLine
      }
    }

    // Fallback to generic title with timestamp
    return `Document - ${new Date().toLocaleDateString()}`
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  /**
   * Split content into chunks for better processing
   */
  chunkContent(content: string, chunkSize: number = 1000, overlap: number = 200): string[] {
    if (content.length <= chunkSize) {
      return [content]
    }

    const chunks: string[] = []
    let start = 0

    while (start < content.length) {
      const end = Math.min(start + chunkSize, content.length)
      let chunk = content.slice(start, end)

      // Try to break at sentence boundaries
      if (end < content.length) {
        const lastSentence = chunk.lastIndexOf('.')
        const lastNewline = chunk.lastIndexOf('\n')
        const breakPoint = Math.max(lastSentence, lastNewline)
        
        if (breakPoint > start + chunkSize * 0.7) {
          chunk = content.slice(start, breakPoint + 1)
          start = breakPoint + 1 - overlap
        } else {
          start = end - overlap
        }
      } else {
        start = end
      }

      chunks.push(chunk.trim())
    }

    return chunks.filter(chunk => chunk.length > 0)
  }

  /**
   * Validate file before processing
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024 // 10MB
    const allowedTypes = ['pdf', 'docx', 'txt', 'md']
    const fileExtension = file.name.toLowerCase().split('.').pop()

    if (file.size > maxSize) {
      return { valid: false, error: 'File size exceeds 10MB limit' }
    }

    if (!fileExtension || !allowedTypes.includes(fileExtension)) {
      return { valid: false, error: 'Unsupported file type. Please upload PDF, DOCX, or TXT files.' }
    }

    return { valid: true }
  }
}

export const documentProcessor = new DocumentProcessor()
export default documentProcessor 