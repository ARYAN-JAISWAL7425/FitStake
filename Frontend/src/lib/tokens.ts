// Forest Sage design tokens — mirrors the .pen file's variables section.
// Use these in places where Tailwind class names aren't enough (e.g. SVG strokes).

export const colors = {
  surfacePrimary: '#F5F3EE',
  surfaceSecondary: '#C8DBBC',
  surfaceInverse: '#1B3A28',
  surfaceCard: '#FFFFFF',
  fgPrimary: '#1B3A28',
  fgSecondary: '#4A6B52',
  fgMuted: '#7A9A80',
  fgInverse: '#FFFFFF',
  accentPrimary: '#2D5E3A',
  accentLime: '#C8FF6B',
  accentMoney: '#3FA85C',
  warning: '#E07B3C',
  borderSoft: '#E5E0D6',
} as const;

export const radii = {
  lg: 8,
  xl: 12,
  '2xl': 20,
  '3xl': 28,
  full: 9999,
} as const;

// Phone preview dimensions (matches .pen frames).
export const PHONE = { width: 390, height: 844 } as const;
