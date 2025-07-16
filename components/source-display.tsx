"use client"

import type { Source } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { 
  ExternalLink, 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Globe, 
  FileText,
  Newspaper,
  Brain,
  Star,
  Copy,
  CheckCircle
} from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

interface SourceDisplayProps {
  sources: Source[]
  className?: string
}

export function SourceDisplay({ sources, className }: SourceDisplayProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const { toast } = useToast()

  const getCredibilityIcon = (score: number) => {
    if (score >= 0.8) return <ShieldCheck className="w-4 h-4 text-green-600" />
    if (score >= 0.6) return <Shield className="w-4 h-4 text-yellow-600" />
    return <ShieldAlert className="w-4 h-4 text-red-600" />
  }

  const getCredibilityText = (score: number) => {
    if (score >= 0.8) return "High Credibility"
    if (score >= 0.6) return "Medium Credibility"
    return "Low Credibility"
  }

  const getSourceIcon = (type: Source['type']) => {
    switch (type) {
      case 'document':
        return <FileText className="w-4 h-4" />
      case 'news':
        return <Newspaper className="w-4 h-4" />
      case 'knowledge_graph':
      case 'answer_box':
        return <Brain className="w-4 h-4" />
      default:
        return <Globe className="w-4 h-4" />
    }
  }

  const getSourceTypeLabel = (type: Source['type']) => {
    switch (type) {
      case 'document':
        return 'Document'
      case 'news':
        return 'News'
      case 'knowledge_graph':
        return 'Knowledge Graph'
      case 'answer_box':
        return 'Featured Answer'
      case 'web':
        return 'Web'
      default:
        return 'Unknown'
    }
  }

  const copyToClipboard = async (text: string, sourceId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(sourceId)
      setTimeout(() => setCopiedId(null), 2000)
      toast({
        title: "Copied to clipboard",
        description: "Citation copied successfully"
      })
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy citation to clipboard",
        variant: "destructive"
      })
    }
  }

  const openSource = (source: Source) => {
    if (source.type === 'document') {
      // For documents, we could scroll to the document or open in a modal
      // For now, just show a toast
      toast({
        title: "Document Reference",
        description: `Reference: ${source.title}`
      })
    } else {
      window.open(source.url, '_blank', 'noopener,noreferrer')
    }
  }

  if (!sources || sources.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">No sources available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5" />
          Sources ({sources.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sources.map((source, index) => (
          <div key={source.id} className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                  [{index + 1}]
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {getSourceIcon(source.type)}
                    <Badge variant="outline" className="text-xs">
                      {getSourceTypeLabel(source.type)}
                    </Badge>
                    <div className="flex items-center gap-1">
                      {getCredibilityIcon(source.credibilityScore)}
                      <span className="text-xs text-muted-foreground">
                        {getCredibilityText(source.credibilityScore)}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {(source.relevanceScore * 100).toFixed(0)}% relevant
                    </Badge>
                  </div>
                  
                  <h4 className="font-medium text-sm mb-1 line-clamp-2">
                    {source.title}
                  </h4>
                  
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-3">
                    {source.snippet}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="truncate">{source.domain}</span>
                    {source.publishDate && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(source.publishDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(source.citation, source.id)}
                  title="Copy citation"
                >
                  {copiedId === source.id ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openSource(source)}
                  title="Open source"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {index < sources.length - 1 && <Separator />}
          </div>
        ))}
        
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Average credibility: {((sources.reduce((sum, s) => sum + s.credibilityScore, 0) / sources.length) * 100).toFixed(1)}%
            </span>
            <span>
              {sources.filter(s => s.type === 'document').length} documents, {sources.filter(s => s.type !== 'document').length} web sources
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 