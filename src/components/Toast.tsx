import React, { useEffect, useState } from 'react';
import { useBudget } from '../context/BudgetContext';

export const Toast: React.FC = () => {
  const { toastMessage } = useBudget();
  const [visible, setVisible] = useState(false);
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    if (toastMessage) {
      setDisplayedText(toastMessage);
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 3600);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  return (
    <div
      id="toast"
      role="status"
      aria-live="polite"
      className={visible ? 'show' : ''}
    >
      {displayedText}
    </div>
  );
};
