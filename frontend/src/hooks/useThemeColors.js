import { useColorScheme as useSystemColorScheme } from 'react-native';
import useThemeStore from '../store/themeStore';
import { darkColors, lightColors } from '../theme/colors';

/**
 * Hook that returns the appropriate color palette based on theme preference.
 * Use this instead of direct `colors` import for theme-aware components.
 */
export const useThemeColors = () => {
  const colorScheme = useThemeStore((state) => state.colorScheme);
  const systemScheme = useSystemColorScheme();

  const effectiveTheme =
    colorScheme === 'system' ? systemScheme || 'dark' : colorScheme;

  return effectiveTheme === 'light' ? lightColors : darkColors;
};

/**
 * Hook that returns whether the app is in dark mode.
 * Useful for conditional styling or StatusBar.
 */
export const useIsDarkMode = () => {
  const colorScheme = useThemeStore((state) => state.colorScheme);
  const systemScheme = useSystemColorScheme();

  const effectiveTheme =
    colorScheme === 'system' ? systemScheme || 'dark' : colorScheme;

  return effectiveTheme !== 'light';
};

export default useThemeColors;
