import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed or running standalone, hide the button
  if (isInstalled) {
    return null;
  }

  // Chrome / Android / Edge / Desktop flow
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="btn primary small"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        title="Install app to your home screen or desktop"
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Install App
      </button>
    );
  }

  // iOS Safari flow (Apple requires user to tap Share -> Add to Home Screen)
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="btn small"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Install App
        </button>

        {showIOSGuide && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
          >
            <div
              className="card stack"
              style={{
                maxWidth: 360,
                width: '100%',
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 12,
              }}
            >
              <h2>Install on iPhone / iPad</h2>
              <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>
                1. Tap the <b>Share</b> button in the bottom Safari toolbar (box with arrow).<br />
                2. Scroll down and tap <b>Add to Home Screen</b>.<br />
                3. Tap <b>Add</b> in the top right.
              </p>
              <button
                type="button"
                className="btn primary"
                onClick={() => setShowIOSGuide(false)}
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
