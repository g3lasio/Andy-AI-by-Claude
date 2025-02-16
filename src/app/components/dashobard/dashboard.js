
'use client';
import React from 'react';
import './dashboard.css';

export default function Dashboard() {
  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <nav className="dashboard-nav">
          <ul>
            <li><a href="/chat">Chat</a></li>
            <li><a href="/documents">Documents</a></li>
            <li><a href="/profile">Profile</a></li>
          </ul>
        </nav>
      </header>
      <main className="dashboard-content">
        <div className="dashboard-grid">
          {/* Aquí puedes agregar las tarjetas o widgets de Uizard */}
        </div>
      </main>
    </div>
  );
}
