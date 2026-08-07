import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/api';
import { 
  ArrowLeft, Send, Trash2, Bot, Loader2, Sparkles, 
  BookOpen, CornerDownLeft, HelpCircle, Eye, EyeOff
} from 'lucide-react';

interface SourceChunk {
  pageNumber: number;
  text: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sourceChunks?: SourceChunk[];
  createdAt?: string;
}

interface Document {
  id: number;
  _id: number;
  title: string;
  subject: string;
  status: string;
}

export const ChatPage: React.FC = () => {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [document, setDocument] = useState<Document | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  
  // Track which cited source text chunk is expanded
  const [expandedSourceIndex, setExpandedSourceIndex] = useState<{messageIndex: number, sourceIndex: number} | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Helper to parse formatting (bold text and inline page citations)
  const parseFormattedText = (text: string): React.ReactNode[] => {
    const parts = text.split(/(\*\*[^*]+\*\*|\[Page\s+\d+\])/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldContent = part.slice(2, -2);
        return <strong key={index} className="font-bold text-white tracking-wide">{boldContent}</strong>;
      }
      if (part.startsWith('[Page') && part.endsWith(']')) {
        return (
          <span key={index} className="inline-flex items-center mx-0.5 px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-350 border border-brand-500/15 text-[10px] font-bold select-none leading-none">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // Helper to render AI messages with clean lists and paragraphs
  const renderMessageContent = (content: string) => {
    const lines = content.split('\n');
    let inList = false;
    const listItems: React.ReactNode[] = [];
    const elements: React.ReactNode[] = [];

    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim();
      const listMatch = trimmed.match(/^[\*\-]\s+(.*)$/);

      if (listMatch) {
        if (!inList) {
          inList = true;
        }
        listItems.push(
          <li key={lineIdx} className="ml-4 list-disc space-y-1 pl-1 text-slate-350 hover:text-slate-200 transition-colors">
            {parseFormattedText(listMatch[1])}
          </li>
        );
      } else {
        if (inList) {
          elements.push(
            <ul key={`list-${lineIdx}`} className="space-y-2 my-2.5">
              {[...listItems]}
            </ul>
          );
          listItems.length = 0;
          inList = false;
        }

        if (trimmed === '') {
          elements.push(<div key={lineIdx} className="h-2" />);
        } else {
          elements.push(
            <p key={lineIdx} className="text-slate-300 my-1 leading-relaxed text-sm">
              {parseFormattedText(trimmed)}
            </p>
          );
        }
      }
    });

    if (inList) {
      elements.push(
        <ul key={`list-end`} className="space-y-2 my-2.5">
          {listItems}
        </ul>
      );
    }

    return <div className="space-y-1.5">{elements}</div>;
  };

  const fetchDocumentAndHistory = async () => {
    try {
      setLoading(true);
      // 1. Fetch document metadata by finding it in documents list
      const docsRes = await api.get('/documents');
      const foundDoc = (docsRes.data.documents || []).find(
        (d: Document) => d.id.toString() === docId || d._id.toString() === docId
      );
      
      if (!foundDoc) {
        alert('Document not found or unauthorized');
        navigate('/');
        return;
      }
      setDocument(foundDoc);

      // 2. Fetch chat history
      const historyRes = await api.get(`/chat/${docId}`);
      setMessages(historyRes.data.messages || []);
    } catch (err) {
      console.error('Failed to load chat workspace:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (docId) {
      fetchDocumentAndHistory();
    }
  }, [docId]);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || sending) return;

    const userMessageText = textToSend;
    setInput('');
    setSending(true);

    // Append user message immediately
    const userMessage: Message = {
      role: 'user',
      content: userMessageText,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const res = await api.post(`/chat/${docId}`, { message: userMessageText });
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: res.data.answer,
        sourceChunks: res.data.sourceChunks,
        createdAt: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, assistantMessage]);

      // Log chat message activity in the dashboard to award XP
      api.post('/dashboard/activity', {
        activityType: 'chat_message_sent',
        documentId: parseInt(docId || '', 10)
      }).catch(err => console.error('Failed to log chat activity:', err));
    } catch (err: any) {
      console.error('Failed to generate RAG response:', err);
      // Append failure error message from AI
      const errorMessage: Message = {
        role: 'assistant',
        content: `Sorry, I encountered an error while processing your request: ${err.response?.data?.error || err.message || 'Unknown network error'}. Please try again.`,
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setSending(false);
      // Refocus text area
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const handleClearChat = async () => {
    if (!window.confirm('Are you sure you want to clear the conversation history for this document?')) {
      return;
    }
    try {
      setClearing(true);
      await api.delete(`/chat/${docId}`);
      setMessages([]);
      setExpandedSourceIndex(null);
    } catch (err) {
      console.error('Failed to clear conversation:', err);
      alert('Failed to clear conversation history. Please try again.');
    } finally {
      setClearing(false);
    }
  };

  // Preset question templates
  const suggestedPrompts = [
    "Summarize the main topics in this document.",
    "What are the most important keywords or formulas?",
    "Explain the core concept in simple terms."
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative selection:bg-brand-500 selection:text-white">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-brand-550/5 rounded-full blur-[140px] pointer-events-none translate-y-1/2"></div>

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-slate-950/70 border-b border-slate-800/80 px-6 py-4 flex justify-between items-center">
        <button
          onClick={() => navigate(document ? `/subject/${encodeURIComponent(document.subject)}` : '/')}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-all py-1.5 px-3 rounded-lg hover:bg-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Materials</span>
        </button>

        <div className="flex-1 text-center px-4 min-w-0">
          <h1 className="text-sm font-bold text-white tracking-tight truncate max-w-xs md:max-w-md mx-auto">
            {document?.title || 'Doubt-Solving Chat'}
          </h1>
          {document && (
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              {document.subject}
            </p>
          )}
        </div>

        <button
          disabled={messages.length === 0 || clearing}
          onClick={handleClearChat}
          className="flex items-center gap-1.5 p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/25 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          title="Clear Conversation"
        >
          {clearing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      </header>

      {/* Workspace */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 flex flex-col justify-between overflow-hidden">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
            <p className="text-sm text-slate-400">Restoring discussion history...</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between overflow-y-auto space-y-6 pr-1.5 pb-24">
            
            {/* Empty State */}
            {messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-20 px-4 space-y-6">
                <div className="bg-brand-500/10 text-brand-400 p-4 rounded-full border border-brand-500/15">
                  <Bot className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white">Ask Recall AI anything</h3>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Enter a question below, and I will search your uploaded document notes to generate a cited response.
                  </p>
                </div>

                <div className="grid gap-3 w-full max-w-md pt-4">
                  {suggestedPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(prompt)}
                      className="text-left bg-slate-900/50 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 p-3.5 rounded-2xl text-xs text-slate-300 hover:text-white transition-all flex items-center justify-between group"
                    >
                      <span>{prompt}</span>
                      <CornerDownLeft className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-all text-brand-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat History Panel */}
            {messages.length > 0 && (
              <div className="space-y-6">
                {messages.map((msg, msgIdx) => (
                  <div 
                    key={msgIdx}
                    className={`flex gap-3.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Bot Avatar */}
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-450 border border-brand-500/20 flex items-center justify-center shrink-0 shadow-md ring-1 ring-brand-500/10">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    {/* Message Bubble wrapper */}
                    <div className="flex flex-col space-y-2 max-w-[82%]">
                      {/* Bubble */}
                      <div 
                        className={`rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-md ${
                          msg.role === 'user' 
                            ? 'bg-gradient-to-r from-brand-650 to-indigo-650 text-white rounded-tr-none border border-brand-500/10' 
                            : 'bg-slate-900/65 backdrop-blur-sm border border-slate-850/80 text-slate-200 rounded-tl-none'
                        }`}
                      >
                        {msg.role === 'user' ? (
                          <div className="whitespace-pre-line select-text font-medium">
                            {msg.content}
                          </div>
                        ) : (
                          <div className="select-text">
                            {renderMessageContent(msg.content)}
                          </div>
                        )}
                      </div>

                      {/* Source Chunks Viewer */}
                      {msg.role === 'assistant' && msg.sourceChunks && msg.sourceChunks.length > 0 && (
                        <div className="space-y-1.5 pt-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                              <BookOpen className="w-3 h-3 text-slate-650" />
                              Sources Cited:
                            </span>
                            {msg.sourceChunks.map((chunk, chunkIdx) => {
                              const isExpanded = expandedSourceIndex?.messageIndex === msgIdx && expandedSourceIndex?.sourceIndex === chunkIdx;
                              return (
                                <button
                                  key={chunkIdx}
                                  onClick={() => {
                                    if (isExpanded) {
                                      setExpandedSourceIndex(null);
                                    } else {
                                      setExpandedSourceIndex({ messageIndex: msgIdx, sourceIndex: chunkIdx });
                                    }
                                  }}
                                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all ${
                                    isExpanded 
                                      ? 'bg-brand-500/20 text-brand-300 border-brand-500/40' 
                                      : 'bg-slate-950/45 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-850 hover:border-slate-800'
                                  }`}
                                >
                                  Page {chunk.pageNumber}
                                  {isExpanded ? (
                                    <EyeOff className="w-2.5 h-2.5" />
                                  ) : (
                                    <Eye className="w-2.5 h-2.5" />
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Expanded Chunk Text Panel */}
                          {msg.sourceChunks.map((chunk, chunkIdx) => {
                            const isExpanded = expandedSourceIndex?.messageIndex === msgIdx && expandedSourceIndex?.sourceIndex === chunkIdx;
                            if (!isExpanded) return null;
                            return (
                              <div 
                                key={chunkIdx}
                                className="bg-slate-950/70 border border-brand-500/10 rounded-xl p-3 text-xs text-slate-350 leading-normal animate-fadeIn shadow-inner"
                              >
                                <p className="font-bold text-brand-400/90 text-[10px] uppercase tracking-wider mb-1.5">
                                  Context snippet from Page {chunk.pageNumber}:
                                </p>
                                <p className="whitespace-pre-line italic">
                                  "... {chunk.text.trim()} ..."
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Simulated/Real Typing Indicator */}
                {sending && (
                  <div className="flex gap-3.5 justify-start">
                    <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 animate-pulse" />
                    </div>
                    <div className="bg-slate-900/80 border border-slate-850 rounded-2xl rounded-tl-none px-4.5 py-3.5 max-w-[82%] flex items-center gap-1.5 shadow-md">
                      <div className="w-1.5 h-1.5 bg-brand-450 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-brand-450 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-brand-450 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            )}

          </div>
        )}
      </main>

      {/* Floating Input Dock */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent p-4 md:p-6 z-20 pointer-events-none">
        <div className="max-w-4xl w-full mx-auto pointer-events-auto">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="bg-slate-900 border border-slate-800/90 rounded-2xl flex items-end p-2 md:p-2.5 shadow-xl backdrop-blur-md focus-within:border-brand-500/60 transition-all gap-2"
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={document ? `Ask a doubt about "${document.title}"...` : "Type your question..."}
              className="flex-1 bg-transparent border-none outline-none resize-none max-h-32 text-sm text-slate-100 placeholder-slate-500 py-2.5 px-3 md:px-3.5 focus:outline-none focus:ring-0 w-full"
              style={{ minHeight: '38px' }}
              disabled={loading || sending}
            />
            
            <button
              type="submit"
              disabled={!input.trim() || loading || sending}
              className="bg-brand-650 hover:bg-brand-600 disabled:bg-slate-950 border border-brand-550/10 text-white font-bold p-2.5 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
