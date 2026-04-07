"use client";

import React from 'react';
import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: 'var(--primary)',
        border: '3px solid var(--primary-light)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 12px 48px rgba(157, 78, 221, 0.4), inset 0 0 15px rgba(255,255,255,0.2)',
        zIndex: 1000,
        transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        overflow: 'hidden'
      }}
      className="theme-toggle-perfect"
      title={theme === 'dark' ? 'Activate Solar Protocol' : 'Initiate Lunar Sync'}
    >
      <div style={{
        position: 'relative',
        width: '32px',
        height: '32px',
        transform: theme === 'dark' ? 'rotate(40deg) scale(1)' : 'rotate(0deg) scale(1.1)',
        transition: 'all 0.7s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        {/* Sun/Moon Core */}
        <div style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: 'white',
          position: 'absolute',
          top: '8px',
          left: '8px',
          boxShadow: theme === 'dark' ? '0 0 25px white' : '0 0 30px #ffb703',
          transition: 'all 0.5s'
        }} />
        
        {/* Dynamic Rays */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: '2px',
              height: '6px',
              background: 'white',
              left: '15px',
              top: '0',
              transformOrigin: '1px 16px',
              transform: `rotate(${i * 30}deg)`,
              opacity: theme === 'light' ? 1 : 0,
              transition: `opacity 0.4s ${i * 0.03}s`
            }}
          />
        ))}

        {/* Shadow Mask */}
        <div style={{
          position: 'absolute',
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          background: 'var(--primary)',
          top: '2px',
          right: '-7px', 
          opacity: theme === 'dark' ? 1 : 0,
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: theme === 'dark' ? 'translateX(0)' : 'translateX(10px)'
        }} />
      </div>
      
      <style jsx>{`
        .theme-toggle-perfect:hover {
          transform: scale(1.15) rotate(15deg);
          border-color: white;
          box-shadow: 0 0 60px rgba(157, 78, 221, 0.8), inset 0 0 20px rgba(255,255,255,0.4);
        }
        .theme-toggle-perfect:active {
          transform: scale(0.9);
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.5; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .theme-toggle-perfect::before {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          border: 2px solid var(--primary-light);
          border-radius: 50%;
          animation: pulse-ring 2s infinite;
          pointer-events: none;
        }
      `}</style>
    </button>
  );
}
