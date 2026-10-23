/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#F0F9F4',
          100: '#DCF2E5',
          200: '#BCE5CE',
          300: '#8DD3AF',
          400: '#56BB8B',
          500: '#198754', // Forest green primary
          600: '#146C43', // Forest green hover
          700: '#105636',
          800: '#0E442C',
          900: '#0C3825',
          darkHover: '#239B60',
        },
        app: {
          bg: '#FAFAF6',
          bgDark: '#101A16',
          surface: '#FFFFFF',
          surfaceDark: '#17251E',
          surfaceSecondary: '#E8F1E9',
          surfaceSecondaryDark: '#24372C',
          sidebar: '#FFFFFF',
          sidebarDark: '#17251E',
          card: '#FFFFFF',
          cardDark: '#17251E',
          border: '#E4E9E3',
          borderDark: '#2A4033',
          textMain: '#1C2924',
          textMainDark: '#F0F5F0',
          textMuted: '#647067',
          textMutedDark: '#A8B9AE',
          chord: '#146C43',
          chordDark: '#6FCF97',
          success: '#16804A',
          successDark: '#4ADE80',
          warning: '#A16207',
          warningDark: '#FBBF24',
          error: '#D92D20',
          errorDark: '#F87171',
          focus: '#198754',
          focusDark: '#6FCF97',
        },
      },
    },
  },
  plugins: [],
}
