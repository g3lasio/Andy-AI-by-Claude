import React, { useState } from 'react';
import './MenuHamburguesa.css';

const MenuHamburguesa = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <button className="hamburger-icon" onClick={toggleMenu}>
        ☰
      </button>
      {isOpen && (
        <ul className="menu-list">
          <li>
            <a href="/home">Home</a>
          </li>
          <li>
            <a href="/settings">Settings</a>
          </li>
          <li>
            <a href="/profile">Profile</a>
          </li>
          <li>
            <a href="/logout">Logout</a>
          </li>
        </ul>
      )}
    </div>
  );
};

export default MenuHamburguesa;
