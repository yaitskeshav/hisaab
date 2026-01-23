// Predefined group icons
export const PREDEFINED_GROUP_ICONS = [
  { id: 'home', emoji: '🏠', label: 'Home' },
  { id: 'trip', emoji: '✈️', label: 'Trip' },
  { id: 'party', emoji: '🎉', label: 'Party' },
  { id: 'food', emoji: '🍕', label: 'Food' },
  { id: 'movie', emoji: '🎬', label: 'Movie' },
  { id: 'shopping', emoji: '🛒', label: 'Shopping' },
  { id: 'sports', emoji: '⚽', label: 'Sports' },
  { id: 'office', emoji: '💼', label: 'Office' },
  { id: 'couple', emoji: '💑', label: 'Couple' },
  { id: 'family', emoji: '👨‍👩‍👧‍👦', label: 'Family' },
  { id: 'friends', emoji: '👯', label: 'Friends' },
  { id: 'roommates', emoji: '🏘️', label: 'Roommates' },
  { id: 'music', emoji: '🎵', label: 'Music' },
  { id: 'games', emoji: '🎮', label: 'Games' },
  { id: 'fitness', emoji: '💪', label: 'Fitness' },
  { id: 'beach', emoji: '🏖️', label: 'Beach' },
  { id: 'mountain', emoji: '⛰️', label: 'Mountain' },
  { id: 'car', emoji: '🚗', label: 'Car' },
  { id: 'coffee', emoji: '☕', label: 'Coffee' },
  { id: 'gift', emoji: '🎁', label: 'Gift' },
];

// Get icon by ID
export const getGroupIcon = (iconId) => {
  return PREDEFINED_GROUP_ICONS.find(icon => icon.id === iconId);
};

// Get emoji by ID (for display)
export const getGroupIconEmoji = (iconUrl, iconType) => {
  if (iconType === 'predefined' && iconUrl) {
    const icon = getGroupIcon(iconUrl);
    return icon?.emoji || '👥';
  }
  return null; // Custom icon uses URL
};
