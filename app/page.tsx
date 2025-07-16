import { ChatInterface } from "@/components/chat-interface"
import { FileUpload } from "@/components/file-upload"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center mb-8">
      <h1 className="text-4xl font-bold mb-4">Research Assistant</h1>
      <p className="text-lg text-muted-foreground">
        Advanced AI research tool with hybrid retrieval, real-time web search, and source verification
      </p>
    </div>

      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-6">
          <ChatInterface />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <FileUpload />
        </TabsContent>
      </Tabs>
    </div>
  )
}
