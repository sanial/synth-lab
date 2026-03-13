import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { getDeepDiveContent } from '../services/gemini';
import { Diagram } from './Diagram';
import ReactMarkdown from 'react-markdown';
import { Loader2, ExternalLink, Info } from 'lucide-react';

interface DeepDiveTabProps {
  topic: string;
}

export const DeepDiveTab: React.FC<DeepDiveTabProps> = ({ topic }) => {
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<{ explanation: string; diagram: string; sources: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getDeepDiveContent(topic);
        setContent(result);
      } catch (err) {
        console.error("Failed to fetch deep dive content:", err);
        setError("Failed to load technical deep dive. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [topic]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin text-[#141414] w-10 h-10 mb-4" />
        <div className="text-center">
          <p className="font-serif italic text-lg">Researching Topic...</p>
          <p className="text-[10px] uppercase tracking-widest opacity-40 mt-1">Grounding with Google Search</p>
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-40">
        <Info size={32} className="mb-4" />
        <p className="font-serif italic text-lg">{error || "No content available."}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="prose prose-sm max-w-none">
            <div className="markdown-body text-xs leading-relaxed text-[#141414]/80">
              <ReactMarkdown>{content.explanation}</ReactMarkdown>
            </div>
          </div>

          {content.sources && content.sources.length > 0 && (
            <div className="pt-6 border-t border-[#141414]/10">
              <span className="text-[9px] font-mono uppercase tracking-widest opacity-40 block mb-3">Verification Sources</span>
              <div className="flex flex-wrap gap-2">
                {content.sources.map((source, i) => (
                  <a 
                    key={i} 
                    href={source} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2 py-1 bg-[#141414]/5 rounded text-[9px] hover:bg-[#141414]/10 transition-colors truncate max-w-[200px]"
                  >
                    <ExternalLink size={10} />
                    {new URL(source).hostname}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <span className="text-[9px] font-mono uppercase tracking-widest opacity-40 block">Conceptual Mechanism</span>
          <Diagram chart={content.diagram} />
        </div>
      </div>
    </motion.div>
  );
};
