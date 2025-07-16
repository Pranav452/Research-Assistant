import { pipeline } from "@xenova/transformers"

// Cache the pipeline to avoid reloading the model on every request
let embedder: any = null

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Initialize the embedding pipeline if not already done
    if (!embedder) {
      embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2")
    }

    // Generate embedding
    const output = await embedder(text, { pooling: "mean", normalize: true })

    // Convert to regular array
    return Array.from(output.data)
  } catch (error) {
    console.error("Error generating embedding:", error)
    throw new Error("Failed to generate embedding")
  }
}
