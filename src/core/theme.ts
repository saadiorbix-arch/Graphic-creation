import type { PublicationTheme } from './types';

/**
 * Curated publication themes modeled after top scientific journals and statistical press
 * (Nature / Science crisp vector style, Economist / Financial Times editorial warmth,
 * and High-Contrast Technical Monospace).
 */
export const PUBLICATION_THEMES: Record<string, PublicationTheme> = {
  journalPrint: {
    id: 'journalPrint',
    name: 'Journal Print (Nature / Science)',
    background: '#FFFFFF',
    paperBorder: '#E2E8F0',
    inkPrimary: '#0F172A',
    inkSecondary: '#334155',
    inkMuted: '#64748B',
    gridline: '#E2E8F0',
    axisLine: '#0F172A',
    accentPrimary: '#0284C7',
    accentSecondary: '#E11D48',
    fontFamilyTitle: '"Newsreader", "Instrument Serif", Georgia, "Times New Roman", serif',
    fontFamilySans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontFamilyMono: '"JetBrains Mono", "SFMono-Regular", Consolas, monospace',
    palette: {
      // Okabe-Ito & Paul Tol inspired colorblind-safe publication palette
      categorical: [
        '#0072B2', // Deep Cerulean
        '#D55E00', // Vermilion
        '#009E73', // Bluish Green
        '#CC79A7', // Reddish Purple
        '#E69F00', // Amber Gold
        '#56B4E9', // Sky Blue
        '#332288', // Indigo
      ],
      sequential: ['#EFF6FF', '#BFDBFE', '#60A5FA', '#2563EB', '#1E3A8A'],
      diverging: ['#B91C1C', '#F8FAFC', '#0369A1'],
      significance: {
        highlight: '#0F172A',
        baseline: '#94A3B8',
        muted: '#CBD5E1',
        confidenceBand: 'rgba(2, 132, 199, 0.14)',
      },
    },
  },
  editorialWarm: {
    id: 'editorialWarm',
    name: 'Editorial Monograph (Warm Paper)',
    background: '#FCFBF7',
    paperBorder: '#E6E1D6',
    inkPrimary: '#1C1917',
    inkSecondary: '#44403C',
    inkMuted: '#78716C',
    gridline: '#E7E2D8',
    axisLine: '#1C1917',
    accentPrimary: '#B91C1C',
    accentSecondary: '#0F766E',
    fontFamilyTitle: '"Newsreader", Georgia, "Times New Roman", serif',
    fontFamilySans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    fontFamilyMono: '"JetBrains Mono", monospace',
    palette: {
      categorical: [
        '#991B1B', // Crimson
        '#0F766E', // Deep Teal
        '#B45309', // Ochre
        '#1D4ED8', // Cobalt
        '#6D28D9', // Violet
        '#4D7C0F', // Olive
      ],
      sequential: ['#FEF3C7', '#FCD34D', '#F59E0B', '#B45309', '#78350F'],
      diverging: ['#991B1B', '#FCFBF7', '#0F766E'],
      significance: {
        highlight: '#991B1B',
        baseline: '#78716C',
        muted: '#D6D3D1',
        confidenceBand: 'rgba(185, 28, 28, 0.12)',
      },
    },
  },
  technicalSlate: {
    id: 'technicalSlate',
    name: 'Technical Blueprint (Dark Research)',
    background: '#0B0F17',
    paperBorder: '#1E293B',
    inkPrimary: '#F8FAFC',
    inkSecondary: '#CBD5E1',
    inkMuted: '#64748B',
    gridline: '#1E293B',
    axisLine: '#94A3B8',
    accentPrimary: '#38BDF8',
    accentSecondary: '#F43F5E',
    fontFamilyTitle: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    fontFamilySans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    fontFamilyMono: '"JetBrains Mono", monospace',
    palette: {
      categorical: [
        '#38BDF8', // Cyan
        '#F43F5E', // Rose
        '#34D399', // Emerald
        '#FBBF24', // Amber
        '#A78BFA', // Purple
        '#FB923C', // Orange
      ],
      sequential: ['#082F49', '#0369A1', '#0284C7', '#38BDF8', '#BAE6FD'],
      diverging: ['#F43F5E', '#1E293B', '#38BDF8'],
      significance: {
        highlight: '#38BDF8',
        baseline: '#64748B',
        muted: '#334155',
        confidenceBand: 'rgba(56, 189, 248, 0.16)',
      },
    },
  },
};

export const DEFAULT_THEME = PUBLICATION_THEMES.journalPrint;

/**
 * Standard print & publication aspect ratio presets (in px at 96 DPI base, scalable to any DPI).
 */
export interface DimensionPreset {
  id: string;
  label: string;
  description: string;
  width: number;
  height: number;
}

export const DIMENSION_PRESETS: DimensionPreset[] = [
  {
    id: 'journal-double-col',
    label: 'Journal Double-Column (180mm)',
    description: 'Standard full-width figure for Nature / Science / IEEE (900 × 560)',
    width: 900,
    height: 560,
  },
  {
    id: 'journal-single-col',
    label: 'Journal Single-Column (88mm)',
    description: 'Compact single-column figure for two-column manuscripts (520 × 480)',
    width: 520,
    height: 480,
  },
  {
    id: 'monograph-wide',
    label: 'Editorial Wide (16:10)',
    description: 'Wide research briefing or presentation plate (1080 × 675)',
    width: 1080,
    height: 675,
  },
  {
    id: 'square-plate',
    label: 'Square Analytical Plate (1:1)',
    description: 'Balanced square format for network, phase-space, or matrix figures (760 × 760)',
    width: 760,
    height: 760,
  },
];
