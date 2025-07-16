import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { generateEmbedding } from "@/lib/embeddings"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)

// Simple file validation
function validateFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024 // 10MB
  const allowedTypes = ['txt', 'md']
  const fileExtension = file.name.toLowerCase().split('.').pop()

  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 10MB limit' }
  }

  if (!fileExtension || !allowedTypes.includes(fileExtension)) {
    return { valid: false, error: 'Currently only TXT and MD files are supported' }
  }

  return { valid: true }
}

export async function POST(req: Request) {
  try {
    console.log("Upload API called")
    
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      console.log("No file provided")
      return NextResponse.json(
        { error: "No file provided" }, 
        { status: 400 }
      )
    }

    console.log(`File received: ${file.name}, size: ${file.size}, type: ${file.type}`)

    // Validate file
    const validation = validateFile(file)
    if (!validation.valid) {
      console.log("File validation failed:", validation.error)
      return NextResponse.json(
        { error: validation.error }, 
        { status: 400 }
      )
    }

    // Process text file
    const text = await file.text()
    const title = file.name.replace(/\.[^/.]+$/, '') || "Uploaded Document"
    
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "No text content found in file" }, 
        { status: 400 }
      )
    }

    console.log(`Processing text content: ${text.length} characters`)

    // Generate embedding for the content
    console.log(`Generating embedding for ${title}...`)
    const embedding = await generateEmbedding(text)

    // Store in database with metadata
    const { data, error } = await supabase
      .from("documents")
      .insert({
        title: title,
        content: text,
        embedding,
        file_type: 'txt',
        file_size: file.size,
        page_count: 1
      })
      .select()

    if (error) {
      console.error("Database storage error:", error)
      return NextResponse.json(
        { error: "Failed to store document in database" }, 
        { status: 500 }
      )
    }

    console.log(`Successfully processed and stored: ${title}`)

    return NextResponse.json({
      success: true,
      document: data[0],
      metadata: {
        originalFilename: file.name,
        fileType: 'txt',
        fileSize: file.size,
        pageCount: 1,
        wordCount: text.trim().split(/\s+/).length,
        contentLength: text.length
      }
    })

  } catch (error) {
    console.error("Upload processing error:", error)
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('PDF')) {
        return NextResponse.json(
          { error: "Failed to process PDF file. Please ensure it's not corrupted or password-protected." }, 
          { status: 400 }
        )
      }
      if (error.message.includes('DOCX')) {
        return NextResponse.json(
          { error: "Failed to process DOCX file. Please ensure it's not corrupted." }, 
          { status: 400 }
        )
      }
      if (error.message.includes('embedding')) {
        return NextResponse.json(
          { error: "Failed to generate text embeddings. Please try again." }, 
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { error: "Internal server error during file processing" }, 
      { status: 500 }
    )
  }
}

// Handle file size limits at the API level
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
} 