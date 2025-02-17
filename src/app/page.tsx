'use client';
import { useState } from 'react';
import Image from 'next/image';

export default function Home() {
  const [activeTab, setActiveTab] = useState('chat');

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-fade-in">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Andy AI Tax Assistant
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
            Tu asistente inteligente para gestión fiscal y documentos
          </p>
          <a href="/corporate" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Descubre ANDY CORP
            <svg className="ml-2 -mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex justify-center space-x-8 px-4" aria-label="Tabs">
              {['chat', 'documents', 'analysis'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'chat' && (
              <div className="flex flex-col space-y-4">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <p className="text-gray-600 dark:text-gray-300">
                    Inicia una conversación con Andy AI para obtener ayuda con tus impuestos
                  </p>
                </div>
                <div className="flex space-x-4">
                  <input
                    type="text"
                    placeholder="Escribe tu mensaje..."
                    className="input-modern"
                  />
                  <button className="btn-modern">
                    Enviar
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Sube tus documentos</h3>
                <p className="mt-2 text-gray-500 dark:text-gray-400">
                  Arrastra y suelta documentos o haz clic para seleccionarlos
                </p>
              </div>
            )}

            {activeTab === 'analysis' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Análisis Fiscal</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Visualiza el análisis detallado de tus documentos fiscales
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recomendaciones</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Obtén sugerencias personalizadas para optimizar tu situación fiscal
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}