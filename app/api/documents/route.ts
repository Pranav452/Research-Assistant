import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { generateEmbedding } from "@/lib/embeddings"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)

export async function POST(req: Request) {
  try {
    const { title, content } = await req.json()

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 })
    }

    // Generate embedding for the document content
    const embedding = await generateEmbedding(content)

    // Store the document with its embedding in Supabase
    const { data, error } = await supabase
      .from("documents")
      .insert({
        title,
        content,
        embedding,
      })
      .select()

    if (error) {
      console.error("Error storing document:", error)
      throw new Error("Failed to store document")
    }

    return NextResponse.json({ success: true, document: data[0] })
  } catch (error) {
    console.error("Error in documents API:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { data: documents, error } = await supabase
      .from("documents")
      .select("id, title, content, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      throw new Error("Failed to fetch documents")
    }

    return NextResponse.json({ documents })
  } catch (error) {
    console.error("Error fetching documents:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
