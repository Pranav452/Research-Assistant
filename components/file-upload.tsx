"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  Upload, 
  FileText, 
  File,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  BookOpen
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface FileUploadProps {
  onUploadComplete?: (documentId: string) => void
}

interface UploadFile {
  file: File
  id: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  progress: number
  error?: string
  documentId?: string
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const { toast } = useToast()

  const getFileIcon = (filename: string) => {
    const extension = filename.toLowerCase().split('.').pop()
    switch (extension) {
      case 'pdf':
        return <FileText className="w-8 h-8 text-red-500" />
      case 'docx':
        return <BookOpen className="w-8 h-8 text-blue-500" />
      default:
        return <File className="w-8 h-8 text-gray-500" />
    }
  }

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const maxSize = 10 * 1024 * 1024 // 10MB
    const allowedTypes = ['txt', 'md'] // Simplified for now - PDF/DOCX processing coming soon
    const fileExtension = file.name.toLowerCase().split('.').pop()

    if (file.size > maxSize) {
      return { valid: false, error: 'File size exceeds 10MB limit' }
    }

    if (!fileExtension || !allowedTypes.includes(fileExtension)) {
      return { valid: false, error: 'Currently only TXT and MD files are supported (PDF/DOCX coming soon!)' }
    }

    return { valid: true }
  }

  const processFile = async (uploadFile: UploadFile) => {
    try {
      // Update status to processing
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'processing', progress: 20 } 
          : f
      ))

      const formData = new FormData()
      formData.append('file', uploadFile.file)

      // Upload and process the file
      console.log('Uploading file:', uploadFile.file.name)
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      console.log('Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Upload failed:', errorText)
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          throw new Error(`Upload failed with status ${response.status}: ${errorText}`)
        }
        throw new Error(errorData.error || `Upload failed with status ${response.status}`)
      }

      const result = await response.json()
      console.log('Upload successful:', result)

      // Update progress
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { 
              ...f, 
              status: 'completed', 
              progress: 100,
              documentId: result.document?.id 
            } 
          : f
      ))

      toast({
        title: "Upload successful",
        description: `${uploadFile.file.name} has been processed and added to your knowledge base.`
      })

      // Notify parent component
      if (result.document?.id && onUploadComplete) {
        onUploadComplete(result.document.id)
      }

    } catch (error) {
      console.error('Upload error:', error)
      
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { 
              ...f, 
              status: 'error', 
              progress: 0,
              error: error instanceof Error ? error.message : 'Upload failed'
            } 
          : f
      ))

      toast({
        title: "Upload failed",
        description: `Failed to process ${uploadFile.file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      })
    }
  }

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles)
    
    fileArray.forEach(file => {
      const validation = validateFile(file)
      
      if (!validation.valid) {
        toast({
          title: "Invalid file",
          description: validation.error,
          variant: "destructive"
        })
        return
      }

      const uploadFile: UploadFile = {
        file,
        id: Math.random().toString(36).substr(2, 9),
        status: 'pending',
        progress: 0
      }

      setFiles(prev => [...prev, uploadFile])

      // Start processing immediately
      setTimeout(() => processFile(uploadFile), 500)
    })
  }, [])

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles)
    }
  }, [addFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles && selectedFiles.length > 0) {
      addFiles(selectedFiles)
    }
    // Reset input
    e.target.value = ''
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload Documents
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver 
              ? 'border-primary bg-primary/10' 
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <div className="space-y-2">
            <p className="text-lg font-medium">
              Drop files here or click to upload
            </p>
            <p className="text-sm text-muted-foreground">
              Supports TXT and MD files up to 10MB
            </p>
          </div>
          
          <div className="mt-4">
            <Label htmlFor="file-upload" className="cursor-pointer">
              <Button variant="outline" className="mt-4" asChild>
                <span>Choose Files</span>
              </Button>
            </Label>
            <Input
              id="file-upload"
              type="file"
              multiple
              accept=".txt,.md"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium">Files ({files.length})</h3>
            {files.map((file) => (
              <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex-shrink-0">
                  {getFileIcon(file.file.name)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium truncate">
                      {file.file.name}
                    </p>
                    <Badge variant={
                      file.status === 'completed' ? 'default' :
                      file.status === 'error' ? 'destructive' :
                      file.status === 'processing' ? 'secondary' : 'outline'
                    }>
                      {file.status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{(file.file.size / 1024 / 1024).toFixed(2)} MB</span>
                    <span>•</span>
                    <span>{file.file.type || 'Unknown type'}</span>
                  </div>
                  
                  {file.status === 'processing' && (
                    <Progress value={file.progress} className="mt-2 h-1" />
                  )}
                  
                  {file.error && (
                    <p className="text-xs text-destructive mt-1">{file.error}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-1">
                  {file.status === 'processing' && (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                  {file.status === 'completed' && (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                  {file.status === 'error' && (
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  )}
                  
                  {(file.status === 'pending' || file.status === 'error') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {files.length > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {files.filter(f => f.status === 'completed').length} of {files.length} files processed
              </span>
              <span>
                {files.filter(f => f.status === 'error').length} errors
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 