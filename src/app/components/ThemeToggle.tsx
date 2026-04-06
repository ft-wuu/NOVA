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
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        background: 'var(--primary)',
        border: '2px solid var(--primary-light)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 32px rgba(157, 78, 221, 0.4)',
        zIndex: 1000,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden'
      }}
      className="theme-toggle-btn"
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <div style={{
        position: 'relative',
        width: '24px',
        height: '24px',
        transform: theme === 'dark' ? 'rotate(40deg)' : 'rotate(0deg)',
        transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        {/* Sun Circle */}
        <div style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: 'white',
          position: 'absolute',
          top: '6px',
          left: '6px',
          boxShadow: theme === 'dark' ? '0 0 10px white' : '0 0 15px #ffb703',
          transition: 'all 0.3s'
        }} />
        
        {/* Sun Rays */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: '2px',
              height: '4px',
              background: 'white',
              left: '11px',
              top: '0',
              transformOrigin: '1px 12px',
              transform: `rotate(${i * 45}deg)`,
              opacity: theme === 'light' ? 1 : 0,
              transition: 'opacity 0.3s'
            }}
          />
        ))}

        {/* Moon Mask (for Dark Mode animation) */}
        <div style={{
          position: 'absolute',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: 'var(--primary)',
          top: '3px',
          right: '-4px', // Offset for crescent moon look
          opacity: theme === 'dark' ? 1 : 0,
          transition: 'opacity 0.3s'
        }} />
      </div>
      
      <style jsx>{`
        .theme-toggle-btn:hover {
          transform: scale(1.1) translateY(-4px);
          box-shadow: 0 12px 40px rgba(157, 78, 221, 0.6);
        }
      `}</style>
    </button>
  );
}
