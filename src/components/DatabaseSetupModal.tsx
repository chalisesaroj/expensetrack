import React, { useState } from 'react';
import { SQL_MIGRATION_SCRIPT } from '../lib/supabase';
import { useBudget } from '../context/BudgetContext';

interface DatabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseSetupModal: React.FC<DatabaseSetupModalProps> = ({ isOpen, onClose }) => {
  const { showToast, recheckSchema } = useBudget();
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SQL_MIGRATION_SCRIPT).then(
      () => {
        setCopied(true);
        showToast('SQL script copied to clipboard!');
        setTimeout(() => setCopied(false), 2500);
      },
      () => {
        showToast('Please copy the SQL text manually from the box.');
      }
    );
  };

  const handleRecheck = async () => {
    setChecking(true);
    const updated = await recheckSchema();
    setChecking(false);
    if (updated) {
      showToast('Database schema verified! All tables and columns are active.');
      onClose();
    } else {
      showToast('New columns not detected yet. Make sure you clicked "Run" in Supabase SQL Editor.');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        className="card stack"
        style={{
          maxWidth: 620,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 12,
        }}
      >
        <div className="row-between">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>⚙️</span>
            <h2>Enable Database Columns in Supabase</h2>
          </div>
          <button type="button" className="btn small" onClick={onClose}>
            ✕
          </button>
        </div>

        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
          To show the new <b>member</b> column on your expenses and store the new <b>family incomes</b> table in Supabase, run this 10-second script in your Supabase SQL Editor.
          <br />
          <b>Note:</b> Your existing expenses and data will NOT be modified or lost.
        </p>

        <div style={{ position: 'relative' }}>
          <pre
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--line)',
              borderRadius: 6,
              padding: '12px 14px',
              fontSize: 12,
              fontFamily: 'var(--font-num)',
              maxHeight: 220,
              overflowX: 'auto',
              margin: 0,
              whiteSpace: 'pre-wrap',
              color: 'var(--fg)',
            }}
          >
            {SQL_MIGRATION_SCRIPT}
          </pre>
        </div>

        <div className="btnrow" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn primary" onClick={handleCopy}>
              {copied ? '✓ Copied SQL!' : 'Copy SQL Script'}
            </button>
            <a
              href="https://supabase.com/dashboard/project/pzahjejjyamgstoofxac/sql/new"
              target="_blank"
              rel="noreferrer"
              className="btn"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              Open Supabase SQL Editor ↗
            </a>
          </div>

          <button type="button" className="btn small" disabled={checking} onClick={handleRecheck}>
            {checking ? 'Checking…' : 'Re-check Database'}
          </button>
        </div>

        <div
          style={{
            background: 'var(--surface-2)',
            padding: '10px 14px',
            borderRadius: 6,
            fontSize: 13,
            color: 'var(--muted)',
            lineHeight: 1.4,
          }}
        >
          <b>Steps:</b>
          <ol style={{ margin: '4px 0 0 16px', padding: 0 }}>
            <li>Click <b>Copy SQL Script</b> above.</li>
            <li>Click <b>Open Supabase SQL Editor ↗</b> (or go to your Supabase Dashboard → SQL Editor).</li>
            <li>Paste and click <b>Run</b> (green button).</li>
            <li>Come back here and click <b>Re-check Database</b>.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
