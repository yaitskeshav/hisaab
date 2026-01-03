export const CATEGORIES = [
  { id: 1, name: 'Food', icon: '🍽️' },
  { id: 2, name: 'Groceries', icon: '🛒' },
  { id: 3, name: 'Transport', icon: '🚗' },
  { id: 4, name: 'Travel', icon: '✈️' },
  { id: 5, name: 'Entertainment', icon: '🎬' },
  { id: 6, name: 'Shopping', icon: '🛍️' },
  { id: 7, name: 'Bills', icon: '📄' },
  { id: 8, name: 'Rent', icon: '🏠' },
  { id: 9, name: 'Drinks', icon: '🍺' },
  { id: 10, name: 'Healthcare', icon: '💊' },
  { id: 11, name: 'Subscriptions', icon: '📱' },
  { id: 12, name: 'Gifts', icon: '🎁' },
  { id: 13, name: 'Sports', icon: '⚽' },
  { id: 14, name: 'Education', icon: '📚' },
  { id: 15, name: 'Pets', icon: '🐾' },
  { id: 16, name: 'Other', icon: '📌' },
];

// Helper to get category icon by id or name
export const getCategoryIcon = (categoryIdOrName) => {
  if (!categoryIdOrName) return '📌';

  const category = CATEGORIES.find(c =>
    c.id === categoryIdOrName ||
    c.name.toLowerCase() === String(categoryIdOrName).toLowerCase()
  );

  return category?.icon || '📌';
};

export default CATEGORIES;
