# Modern Full-Stack RAG Template

A production-ready Retrieval-Augmented Generation (RAG) application built with Next.js, Supabase, and the Vercel AI SDK. This template provides a complete foundation for building AI-powered applications that can answer questions based on your own documents.

## 🚀 Features

- **Full-Stack Architecture**: Next.js handles both frontend and backend
- **Vector Database**: Supabase with pgvector for efficient similarity search
- **Local Embeddings**: Free embeddings using Hugging Face transformers
- **Streaming AI**: Real-time chat interface with streaming responses
- **Modern UI**: Beautiful interface built with shadcn/ui and Tailwind CSS
- **TypeScript**: Full type safety throughout the application
- **Production Ready**: Error handling, loading states, and optimizations

## 🏗️ Architecture

\`\`\`
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │    │   Supabase DB   │    │   AI Provider   │
│                 │    │                 │    │                 │
│ • Chat UI       │◄──►│ • Documents     │    │ • Google Gemini │
│ • File Upload   │    │ • Embeddings    │    │ • OpenAI        │
│ • API Routes    │    │ • Vector Search │    │ • Anthropic     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  @xenova/       │
                    │  transformers   │
                    │  (Embeddings)   │
                    └─────────────────┘
\`\`\`

## 🛠️ Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Database**: Supabase (PostgreSQL + pgvector)
- **Embeddings**: @xenova/transformers.js (Hugging Face)
- **AI SDK**: Vercel AI SDK
- **UI**: shadcn/ui + Tailwind CSS
- **Language**: TypeScript

## 📋 Prerequisites

- Node.js 18+ 
- A Supabase account (free tier available)
- An AI provider API key (Google AI, OpenAI, etc.)

## 🚀 Quick Start

### 1. Clone and Install

\`\`\`bash
# Create a new project using this template
npx create-next-app@latest my-rag-app --typescript --tailwind --eslint
cd my-rag-app

# Install dependencies
npm install @ai-sdk/google ai supabase-js @xenova/transformers

# Initialize shadcn/ui
npx shadcn@latest init
npx shadcn@latest add button card input textarea tabs scroll-area label toast
\`\`\`

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings → API to get your project URL and anon key
3. Go to Database → Extensions and enable `vector`
4. Run the SQL from `scripts/setup-database.sql` in the SQL editor
5. Optionally run `scripts/seed-sample-data.sql` for test data

### 3. Configure Environment Variables

\`\`\`bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local with your actual values
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key
\`\`\`

### 4. Run the Application

\`\`\`bash
npm run dev
\`\`\`

Visit `http://localhost:3000` to see your RAG application in action!

## 📖 How It Works

### The RAG Pipeline

1. **Document Upload**: Users upload documents through the web interface
2. **Embedding Generation**: Documents are converted to vector embeddings using Hugging Face models
3. **Vector Storage**: Embeddings are stored in Supabase with pgvector
4. **Query Processing**: User questions are converted to embeddings
5. **Similarity Search**: Most relevant documents are retrieved using vector similarity
6. **Context Injection**: Retrieved documents are added to the AI prompt
7. **Response Generation**: AI generates answers based on the provided context
8. **Streaming UI**: Responses are streamed back to the user in real-time

### Key Components

- **`/app/api/chat/route.ts`**: Main RAG logic and AI streaming
- **`/app/api/documents/route.ts`**: Document upload and storage
- **`/lib/embeddings.ts`**: Embedding generation using transformers.js
- **`/components/chat-interface.tsx`**: Real-time chat UI
- **`/components/document-upload.tsx`**: Document upload interface

## 🔧 Customization

### Changing the Embedding Model

Edit `/lib/embeddings.ts`:

\`\`\`typescript
// Use a different Hugging Face model
embedder = await pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5')
\`\`\`

### Switching AI Providers

Edit `/app/api/chat/route.ts`:

\`\`\`typescript
import { openai } from '@ai-sdk/openai'

const result = await streamText({
  model: openai('gpt-4'),
  // ... rest of config
})
\`\`\`

### Customizing the UI

All UI components are in `/components/ui/` and can be customized. The design system uses Tailwind CSS for styling.

## 🚀 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your environment variables in the Vercel dashboard
4. Deploy!

\`\`\`bash
# Or use Vercel CLI
npm i -g vercel
vercel
\`\`\`

### Environment Variables for Production

Make sure to set these in your deployment platform:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY` (or your chosen AI provider key)

## 📊 Performance Considerations

- **Embedding Caching**: The transformers.js model is cached after first load
- **Vector Indexing**: Supabase uses IVFFlat indexing for fast similarity search
- **Streaming**: AI responses are streamed for better user experience
- **Code Splitting**: Next.js automatically splits code for optimal loading

## 🔒 Security Best Practices

- **Row Level Security**: Enable RLS on Supabase tables
- **API Rate Limiting**: Implement rate limiting for production
- **Input Validation**: Validate all user inputs
- **Environment Variables**: Never commit API keys to version control

## 🐛 Troubleshooting

### Common Issues

1. **Embedding Model Loading**: First request may be slow as the model downloads
2. **Vector Dimension Mismatch**: Ensure your database vector dimension matches your model
3. **CORS Issues**: Make sure your Supabase project allows your domain

### Debug Mode

Enable debug logging:

\`\`\`typescript
// In your API routes
console.log('Debug info:', { query, results, context })
\`\`\`

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel AI SDK](https://sdk.vercel.ai)
- [Hugging Face Transformers.js](https://huggingface.co/docs/transformers.js)
- [shadcn/ui Components](https://ui.shadcn.com)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - feel free to use this template for any project!

## 🆘 Support

- Create an issue for bugs or feature requests
- Check the documentation links above
- Join the community discussions

---

**Happy building! 🚀**

This template gives you everything you need to build production-ready RAG applications. Customize it for your specific use case and scale as needed.
