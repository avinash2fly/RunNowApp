// Design tokens from claude.ai/design — Material You warm palette
export const Colors = {
  // Surfaces (light)
  surface:       '#FBF8F5',
  surfaceDim:    '#F4EFE8',
  surface1:      '#FFFFFF',
  surface2:      '#F4EFE8',
  surface3:      '#EBE3D9',
  onSurface:     '#1F1B17',
  onSurfaceVar:  '#5A544C',
  outline:       'rgba(31,27,23,0.10)',
  outlineStrong: 'rgba(31,27,23,0.18)',

  // Verdict: GO
  go:         '#1F8A4C',
  goSoft:     '#DEF2E1',
  onGoSoft:   '#0F4F2A',

  // Verdict: WAIT
  wait:       '#A56A0C',
  waitSoft:   '#FBEBCB',
  onWaitSoft: '#5A3A02',

  // Verdict: SKIP
  skip:       '#B0432B',
  skipSoft:   '#F8DDD3',
  onSkipSoft: '#5C1F0F',

  // Accent options
  accentOrange: '#F25A1F',
  accentGreen:  '#1F8A5B',
  accentBlue:   '#2A6FDB',
  accentViolet: '#7B61FF',

  // Default accent (blue)
  accent:        '#2A6FDB',
  onAccent:      '#FFFFFF',
  accentSoft:    '#D6E4FA',
  onAccentSoft:  '#173B7A',

  white: '#FFFFFF',
  black: '#000000',
};

export const AccentOptions = [
  { key: 'orange', color: '#F25A1F', label: 'Orange' },
  { key: 'green',  color: '#1F8A5B', label: 'Green'  },
  { key: 'blue',   color: '#2A6FDB', label: 'Blue'   },
  { key: 'violet', color: '#7B61FF', label: 'Violet' },
] as const;

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
};

export const Radius = {
  sm:  8,
  md:  14,
  lg:  20,
  xl:  24,
  pill: 999,
};

export const Typography = {
  hero:    { fontSize: 64, fontWeight: '700' as const, letterSpacing: -2 },
  h1:      { fontSize: 30, fontWeight: '700' as const, letterSpacing: -0.8 },
  h2:      { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.5 },
  h3:      { fontSize: 18, fontWeight: '600' as const, letterSpacing: -0.2 },
  body:    { fontSize: 15, fontWeight: '500' as const },
  bodyBold:{ fontSize: 15, fontWeight: '600' as const },
  small:   { fontSize: 13, fontWeight: '500' as const },
  label:   { fontSize: 12, fontWeight: '700' as const, letterSpacing: 0.6 },
  micro:   { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.4 },
};
