import React from 'react';
import { Hero } from './Hero';
import { SpendForm } from './SpendForm';
import { CategoryCards } from './CategoryCards';

export const OverviewTab: React.FC = () => {
  return (
    <>
      <Hero />
      <SpendForm />
      <CategoryCards />
    </>
  );
};
