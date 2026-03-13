import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { Diagram } from './Diagram';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatAgentProps {
  currentDiagram: string | null;
  selectedPapers: { title: string; summary: string }[];
  onClose: () => void;
}

export const ChatAgent: React.FC<ChatAgentProps> = ({ currentDiagram, selectedPapers, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "I'm your Research Agent. I can explain the concepts in these papers or help you understand the technical diagram. What would you like to dive into?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const context = `
        Current Technical Diagram (Mermaid.js):
        ${currentDiagram || 'No diagram generated yet.'}

        Selected Research Papers:
        ${selectedPapers.map(p => `Title: ${p.title}\nSummary: ${p.summary}`).join('\n\n')}
      `;

      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: `
            You are a highly advanced Google Research Agent specializing in technical visualization and concept explanation.
            Your goal is to help the user understand complex research papers and their corresponding technical diagrams.
            
            Context:
            ${context}
            
            Guidelines:
            1. Use the provided diagram and paper summaries to explain concepts.
            2. If the user asks for a visual explanation or if you think a diagram would help, you MUST include a Mermaid.js code block in your response.
            3. Use the format: \`\`\`mermaid [code] \`\`\`
            4. Mermaid Syntax Rules (CRITICAL):
               - Use "graph TD" for flowcharts.
               - ALWAYS put a newline or space after "graph TD" before starting the first node.
               - ALWAYS wrap node labels in double quotes if they contain special characters like parentheses, brackets, colons, or commas. Example: A["Process (Step 1)"]
               - Avoid using reserved words like "end", "graph", "subgraph" as node IDs.
               - Ensure all arrows are valid (e.g., -->, ---, ==>, -- text -->).
               - Do not use brackets [] or () directly in node IDs.
            5. Refer to specific nodes or flows in the diagrams you generate.
            6. Keep explanations technical yet accessible.
            7. Be concise and professional.
          `,
        },
      });

      const response = await chat.sendMessage({ message: userMessage });
      setMessages(prev => [...prev, { role: 'assistant', content: response.text || "I'm sorry, I couldn't process that request." }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "An error occurred while communicating with the agent. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = (content: string) => {
    const parts = content.split(/(```mermaid[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith('```mermaid')) {
        const chart = part.replace(/```mermaid\n?|```/g, '').trim();
        return (
          <div key={i} className="my-4 w-full overflow-hidden rounded-lg border border-[#141414]/10 bg-white p-2">
            <Diagram chart={chart} />
          </div>
        );
      }
      return <p key={i} className="whitespace-pre-wrap">{part}</p>;
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 400 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 400 }}
      className="flex flex-col h-full bg-white border-l border-[#141414] shadow-2xl"
    >
      {/* Header */}
      <div className="p-4 border-b border-[#141414] flex justify-between items-center bg-[#141414] text-[#E4E3E0]">
        <div className="flex items-center gap-2">
          <Bot size={18} />
          <span className="font-serif italic text-sm">Research Agent</span>
        </div>
        <button onClick={onClose} className="hover:opacity-50 transition-opacity">
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F0EFED]">
        {messages.map((msg, i) => (
          <div key={i} className={cn(
            "flex gap-3 w-full",
            msg.role === 'user' ? "flex-row-reverse" : "flex-row"
          )}>
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
              msg.role === 'user' ? "bg-[#141414] text-[#E4E3E0]" : "bg-white border border-[#141414]/10"
            )}>
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className={cn(
              "p-3 rounded-2xl text-xs leading-relaxed shadow-sm max-w-[85%]",
              msg.role === 'user' ? "bg-[#141414] text-[#E4E3E0]" : "bg-white text-[#141414] border border-[#141414]/5"
            )}>
              {renderContent(msg.content)}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 mr-auto">
            <div className="w-8 h-8 rounded-lg bg-white border border-[#141414]/10 flex items-center justify-center">
              <Loader2 size={14} className="animate-spin" />
            </div>
            <div className="p-3 rounded-2xl bg-white text-[#141414] border border-[#141414]/5 text-xs italic opacity-50">
              Analyzing context...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[#141414] bg-white">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about the diagram or papers..."
            className="w-full bg-[#F0EFED] border-none rounded-xl py-3 pl-4 pr-12 text-xs focus:ring-1 focus:ring-[#141414] outline-none"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#141414] text-[#E4E3E0] rounded-lg disabled:opacity-30 transition-all"
          >
            <Send size={14} />
          </button>
        </div>
        <div className="mt-2 flex items-center gap-1 opacity-30 text-[9px] uppercase tracking-widest justify-center">
          <Sparkles size={8} />
          <span>Powered by Gemini 3 Flash</span>
        </div>
      </div>
    </motion.div>
  );
};

// Helper function for class names
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

