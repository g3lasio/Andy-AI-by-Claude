
'use client';
import { useState, useEffect, useRef } from 'react';
import { ChatService } from '@/core-hub/chat/services/chat.service';

export default function ChatPage() {
  const [messages, setMessages] = useState<Array<{ content: string; role: 'user' | 'assistant' }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatService = ChatService.getInstance();

  const quickActions = [
    { id: 'tax', label: 'Calcular Impuestos', icon: '📊' },
    { id: 'credit', label: 'Estado Crediticio', icon: '💳' },
    { id: 'docs', label: 'Documentos', icon: '📄' },
    { id: 'help', label: 'Ayuda', icon: '❔' },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleQuickAction = (actionId: string) => {
    const actionMessages = {
      tax: "¿Podrías ayudarme a calcular mis impuestos?",
      credit: "Quisiera revisar mi estado crediticio",
      docs: "Muéstrame mis documentos recientes",
      help: "¿Qué puedes hacer por mí?"
    };
    
    if (actionId in actionMessages) {
      handleSubmit(actionMessages[actionId as keyof typeof actionMessages]);
    }
  };

  const handleSubmit = async (message: string) => {
    if (!message.trim()) return;

    setMessages(prev => [...prev, { content: message, role: 'user' }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatService.processMessage('test-user', message);
      setMessages(prev => [...prev, { content: response.content, role: 'assistant' }]);
    } catch (error) {
      setMessages(prev => [...prev, { content: 'Error processing message', role: 'assistant' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white dark:bg-gray-800 shadow-lg transition-all duration-300`}>
        <div className="p-4">
          <h2 className={`font-bold text-xl mb-4 ${!isSidebarOpen && 'hidden'}`}>Andy AI</h2>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {isSidebarOpen ? '◀' : '▶'}
          </button>
        </div>
        <nav className="mt-4">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action.id)}
              className="w-full p-4 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="text-xl">{action.icon}</span>
              {isSidebarOpen && <span>{action.label}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[70%] p-4 rounded-2xl ${
                message.role === 'user' 
                  ? 'bg-blue-600 text-white ml-auto' 
                  : 'bg-white dark:bg-gray-800 shadow-md'
              }`}>
                {message.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(input); }} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu mensaje..."
              className="flex-1 p-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 dark:text-white"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
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
