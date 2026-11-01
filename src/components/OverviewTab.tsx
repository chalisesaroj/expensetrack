import React from 'react';
import { Hero } from './Hero';
import { FamilyBreakdownCard } from './FamilyBreakdownCard';
import { SpendForm } from './SpendForm';
import { CategoryCards } from './CategoryCards';

export const OverviewTab: React.FC = () => {
  return (
    <>
      <Hero />
      <FamilyBreakdownCard />
      <SpendForm />
      <CategoryCards />
    </>
  );
};
