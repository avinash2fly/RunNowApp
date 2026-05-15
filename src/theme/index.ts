// Material You / Material 3 inspired tokens — warm, with verdict semantic colors.
// Mirrors the design system in /tmp/runnow-design.

export interface Tokens {
  accent: string;
  accentSoft: string;
  onAccentSoft: string;
  onAccent: string;
  surface: string;
  surfaceDim: string;
  surface1: string;
  surface2: string;
  surface3: string;
  onSurface: string;
  onSurfaceVar: string;
  outline: string;
  outlineStrong: string;
  go: string;
  goSoft: string;
  onGoSoft: string;
  wait: string;
  waitSoft: string;
  onWaitSoft: string;
  skip: string;
  skipSoft: string;
  onSkipSoft: string;
  isDark: boolean;
}

export function hexMix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 255, ag = (pa >> 8) & 255, ab = pa & 255;
  const br = (pb >> 16) & 255, bg = (pb >> 8) & 255, bb = pb & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return '#' + [r, g, bl].map(n => n.toString(16).padStart(2, '0')).join('');
}

export function makeTokens(accent: string, dark = false): Tokens {
  const isDark = !!dark;
  const surface       = isDark ? '#15110D' : '#FBF8F5';
  const surfaceDim    = isDark ? '#0F0C09' : '#F4EFE8';
  const surface1      = isDark ? '#1E1A15' : '#FFFFFF';
  const surface2      = isDark ? '#26211B' : '#F4EFE8';
  const surface3      = isDark ? '#2D2822' : '#EBE3D9';
  const onSurface     = isDark ? '#EBE3D9' : '#1F1B17';
  const onSurfaceVar  = isDark ? '#A8A095' : '#5A544C';
  const outline       = isDark ? 'rgba(168,160,149,0.22)' : 'rgba(31,27,23,0.10)';
  const outlineStrong = isDark ? 'rgba(168,160,149,0.4)' : 'rgba(31,27,23,0.18)';

  const accentSoft = isDark ? hexMix(accent, '#000000', 0.55) : hexMix(accent, '#FFFFFF', 0.78);
  const onAccentSoft = isDark ? hexMix(accent, '#FFFFFF', 0.65) : hexMix(accent, '#000000', 0.55);

  return {
    accent,
    accentSoft,
    onAccentSoft,
    onAccent: '#FFFFFF',
    surface, surfaceDim, surface1, surface2, surface3,
    onSurface, onSurfaceVar,
    outline, outlineStrong,
    go:     isDark ? '#7DCB87' : '#1F8A4C',
    goSoft: isDark ? '#1A2E22' : '#DEF2E1',
    onGoSoft: isDark ? '#B6E3BE' : '#0F4F2A',
    wait:     isDark ? '#E8B663' : '#A56A0C',
    waitSoft: isDark ? '#2C2316' : '#FBEBCB',
    onWaitSoft: isDark ? '#F0CB89' : '#5A3A02',
    skip:     isDark ? '#E8866D' : '#B0432B',
    skipSoft: isDark ? '#2A1A14' : '#F8DDD3',
    onSkipSoft: isDark ? '#F0A78F' : '#5C1F0F',
    isDark,
  };
}

// Legacy default exports for any code not yet migrated.
export const Colors = makeTokens('#2A6FDB', false);

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
