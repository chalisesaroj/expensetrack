import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderRadius: 8,
        background: 'var(--warn)',
        color: '#FFFFFF',
        padding: '8px 14px',
        fontSize: 13,
        fontWeight: 500,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: '#FFFFFF',
        }}
      />
      Offline — Check internet connection to sync with cloud.
    </div>
  );
};
