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
    <div className="flex flex-col h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-4xl mx-auto w-full">
        <div className="space-y-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] p-4 rounded-2xl shadow-lg backdrop-blur-sm border
                ${message.role === 'user' 
                  ? 'bg-cyan-600/50 text-white ml-auto border-cyan-500/30' 
                  : 'bg-slate-800/50 text-cyan-50 border-slate-700/30'}`}
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

      <div className="border-t dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
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
              className="flex-1 p-3 rounded-xl border border-gray-200 dark:border-gray-600 
                        bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm
                        focus:ring-2 focus:ring-blue-500 dark:text-white
                        transition-all duration-200"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white rounded-xl 
                       hover:bg-blue-700 transition-colors disabled:opacity-50
                       shadow-sm hover:shadow-md"
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