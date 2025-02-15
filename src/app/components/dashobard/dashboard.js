import React from 'react';
import './Dashboard.css';
import AndyIcon from './AndyIcon'; // Importa el icono de Andy AI
import MenuHamburguesa from './MenuHamburguesa'; // Importa el menú hamburguesa

const Dashboard = () => {
  return (
    <div className="dashboard">
      {/* El fondo del Dashboard */}
      <div className="background"></div>

      {/* El menú hamburguesa en el sidebar */}
      <MenuHamburguesa />

      {/* Icono de Andy y nombre como enlace al chat */}
      <div className="andy-icon-container">
        <AndyIcon />
        <a href="/chat" className="andy-name">
          Andy AI
        </a>
      </div>

      {/* Los módulos circulares */}
      <div className="modules">
        <div className="module">FinAdvisor</div>
        <div className="module">TaxAdvisor</div>
        <div className="module">CreditGuardian</div>
        <div className="module">Build Legacy</div>
        <div className="module">Edu Profit</div>
      </div>
    </div>
  );
};

export default Dashboard;
