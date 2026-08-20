import { useMemo, useState } from 'react';
import { generateTransactions } from '../data/generateTransactions';

// Pre-seeded transactions
const initialTransactions = generateTransactions(2000);

export const useTransactions = () => {
  const [transactions] = useState(initialTransactions);
  const [filter, setFilter] = useState('');

  const filteredTransactions = useMemo(() => {
    const normalizedFilter = filter.toLowerCase();
    return transactions.filter(t =>
      t.name.toLowerCase().includes(normalizedFilter) ||
      t.category.toLowerCase().includes(normalizedFilter)
    );
  }, [transactions, filter]);

  return {
    transactions,
    filteredTransactions,
    filter,
    setFilter
  };
};
