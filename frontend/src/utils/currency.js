/**
 * Currency formatting utilities for consistent display across the app
 */

/**
 * Format amount as Indian Rupees
 * Shows decimals only when necessary (e.g., ₹5.50 but ₹5 for whole numbers)
 * @param {number|string} amount - The amount to format
 * @param {object} options - Formatting options
 * @param {boolean} options.showSign - Show + for positive amounts (default: false)
 * @param {boolean} options.compact - Use compact notation for large numbers (default: false)
 * @param {number} options.maxDecimals - Maximum decimal places (default: 2)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, options = {}) => {
  const { showSign = false, compact = false, maxDecimals = 2 } = options;

  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(num)) return '₹0';

  const absNum = Math.abs(num);

  // Determine if we need decimals
  const hasDecimals = absNum % 1 !== 0;
  const minDecimals = hasDecimals ? 2 : 0;

  let formatted;

  if (compact && absNum >= 100000) {
    // Compact format for lakhs/crores
    if (absNum >= 10000000) {
      formatted = `₹${(absNum / 10000000).toFixed(hasDecimals ? 2 : 1)}Cr`;
    } else {
      formatted = `₹${(absNum / 100000).toFixed(hasDecimals ? 2 : 1)}L`;
    }
  } else {
    // Standard Indian number format
    formatted = `₹${absNum.toLocaleString('en-IN', {
      minimumFractionDigits: minDecimals,
      maximumFractionDigits: maxDecimals,
    })}`;
  }

  // Handle sign
  if (num < 0) {
    return `-${formatted}`;
  } else if (showSign && num > 0) {
    return `+${formatted}`;
  }

  return formatted;
};

/**
 * Format amount for display in activity/history (more compact)
 * @param {number|string} amount - The amount to format
 * @returns {string} Formatted string without currency symbol for inline use
 */
export const formatAmountShort = (amount) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(num)) return '0';

  const absNum = Math.abs(num);
  const hasDecimals = absNum % 1 !== 0;

  return absNum.toLocaleString('en-IN', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
};

/**
 * Format balance with appropriate color indication text
 * @param {number} amount - The balance amount
 * @returns {object} { text: string, type: 'positive' | 'negative' | 'settled' }
 */
export const formatBalance = (amount) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(num) || Math.abs(num) < 0.01) {
    return { text: '₹0', type: 'settled' };
  }

  const formatted = formatCurrency(Math.abs(num));

  if (num > 0) {
    return { text: formatted, type: 'positive' }; // You get back
  } else {
    return { text: formatted, type: 'negative' }; // You owe
  }
};

export default {
  formatCurrency,
  formatAmountShort,
  formatBalance,
};
