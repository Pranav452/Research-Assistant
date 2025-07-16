-- Sample documents to test the RAG system
-- Run this after setting up the database and uploading some real documents

INSERT INTO documents (title, content) VALUES 
(
  'Next.js Getting Started',
  'Next.js is a React framework that enables functionality such as server-side rendering and generating static websites. It provides a great developer experience with features like automatic code splitting, optimized performance, and built-in CSS support. To get started with Next.js, you can create a new project using create-next-app.'
),
(
  'Supabase Database Guide',
  'Supabase is an open-source Firebase alternative that provides a Postgres database, authentication, instant APIs, and real-time subscriptions. It includes pgvector extension support for vector similarity search, making it perfect for AI applications. You can create tables, run SQL queries, and manage your data through the Supabase dashboard.'
),
(
  'AI SDK Documentation',
  'The Vercel AI SDK is a library for building AI-powered streaming text and chat UIs. It provides React hooks like useChat and useCompletion, as well as backend utilities for working with language models. The SDK supports multiple AI providers including OpenAI, Anthropic, and Google Gemini.'
);
