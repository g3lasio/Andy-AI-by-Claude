'use client';
import { useState, useEffect, useRef } from 'react';
import { ChatService } from '@/core-hub/chat/services/chat.service';

export default function ChatPage() {
  const [messages, setMessages] = useState<Array<{ content: string; role: 'user' | 'assistant' }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatService = ChatService.getInstance();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (message: string) => {
    if (!message.trim()) return;

    setMessages(prev => [...prev, { content: message, role: 'user' }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatService.processMessage('test-user', message);
      setMessages(prev => [...prev, { content: response.content, role: 'assistant' }]);
    } catch (error) {
      setMessages(prev => [...prev, { content: 'Error al procesar el mensaje', role: 'assistant' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="p-4 border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50">
        <h1 className="text-2xl font-semibold text-white text-center">Andy AI Tax Assistant</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-5xl mx-auto w-full">
        <div className="space-y-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] p-4 rounded-2xl shadow-xl backdrop-blur-sm border
                ${message.role === 'user' 
                  ? 'bg-blue-600/40 text-white ml-auto border-blue-500/30 hover:bg-blue-600/50 transition-colors' 
                  : 'bg-slate-700/40 text-slate-100 border-slate-600/30 hover:bg-slate-700/50 transition-colors'}`}
              >
                <p className="text-sm md:text-base leading-relaxed">
                  {message.content}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-slate-700/50 bg-slate-800/50 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(input);
            }} 
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu mensaje..."
              className="flex-1 p-4 rounded-xl border border-slate-600/50 
                        bg-slate-700/30 backdrop-blur-md text-white
                        focus:ring-2 focus:ring-blue-500 focus:border-blue-500/50
                        transition-all duration-200 placeholder-slate-400"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl 
                       hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50
                       shadow-lg hover:shadow-xl font-medium"
              disabled={isLoading}
            >
              {isLoading ? 'Enviando...' : 'Enviar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}