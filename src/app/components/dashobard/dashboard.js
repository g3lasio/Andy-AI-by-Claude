
'use client';
import React from 'react';
import './dashboard.css';

'use client';
import React from 'react';
import IconButton from '../ui/IconButton';
import './dashboard.css';

const modules = [
  { name: 'TaxAdvisor', icon: 'calculator' },
  { name: 'FinAdvisor', icon: 'chart' },
  { name: 'CreditGuardian', icon: 'shield' },
  { name: 'Build Legacy', icon: 'home' },
  { name: 'Edu Profit', icon: 'education' }
];

import BackgroundCircle from '../ui/BackgroundCircle';

export default function Dashboard() {
  return (
    <div className="dashboard-container" style={{ backgroundColor: '#112121' }}>
      <div className="andy-branding">
        <IconButton />
        <h1 className="andy-title">Andy AI</h1>
      </div>
      <div className="modules-circle">
        <BackgroundCircle />
        {modules.map((module, index) => (
          <div key={index} className="module-item">
            <div className="module-circle">{module.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
