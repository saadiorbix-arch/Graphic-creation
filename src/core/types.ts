import type React from 'react';

/**
 * Editorial & typographic metadata for a publication-grade research figure.
 */
export interface FigureMetadata {
  /** Primary figure number or identifier, e.g., "FIGURE 1" or "EXHIBIT A" */
  figureLabel?: string;
  /** Main analytical headline or title */
  title: string;
  /** Deck / subtitle explaining units, scope, or methodology */
  subtitle?: string;
  /** Primary data source attribution */
  source?: string;
  /** Methodological notes, statistical significance notes, or caveats */
  footnote?: string;
  /** Author, lab, or publication credit */
  credit?: string;
}

/**
 * Exact coordinate geometry and margin specification for SVG composition.
 */
export interface FigureDimensions {
  /** Total SVG width in user units (px at 1x) */
  width: number;
  /** Total SVG height in user units (px at 1x) */
  height: number;
  /** Inner plotting margins separating the graphic from outer frame/annotations */
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

/**
 * Computed inner plotting bounds derived from FigureDimensions.
 */
export interface PlotBounds extends FigureDimensions {
  innerWidth: number;
  innerHeight: number;
}

/**
 * Declarative parameter descriptor so a visual framework can expose bespoke
 * compositional controls (e.g., scale mode, reference threshold, CI band toggle)
 * without turning into a generic chart builder.
 */
export type ParameterControlType = 'number' | 'boolean' | 'select' | 'color' | 'text';

export interface FrameworkParameterOption {
  label: string;
  value: string | number;
}

export interface FrameworkParameterSchema<TConfig, K extends keyof TConfig = keyof TConfig> {
  key: K;
  label: string;
  description?: string;
  type: ParameterControlType;
  min?: number;
  max?: number;
  step?: number;
  options?: FrameworkParameterOption[];
}

/**
 * Validation result when injecting external JSON/CSV data into a framework.
 */
export interface DataValidationResult<TData> {
  valid: boolean;
  data?: TData;
  errors?: string[];
  recordCount?: number;
}

/**
 * Props passed to a bespoke Visual Framework's SVG inner render component.
 * Note: The component renders directly inside the calibrated `<svg>` coordinate space.
 */
export interface FrameworkRenderProps<TData, TConfig> {
  data: TData;
  config: TConfig;
  bounds: PlotBounds;
  theme: PublicationTheme;
}

/**
 * Publication visual theme tokens (e.g., Academic Print, Journal Serif, Technical Mono).
 */
export interface PublicationTheme {
  id: string;
  name: string;
  background: string;
  paperBorder: string;
  inkPrimary: string;
  inkSecondary: string;
  inkMuted: string;
  gridline: string;
  axisLine: string;
  accentPrimary: string;
  accentSecondary: string;
  fontFamilyTitle: string;
  fontFamilySans: string;
  fontFamilyMono: string;
  palette: {
    categorical: string[];
    sequential: string[];
    diverging: [string, string, string];
    significance: {
      highlight: string;
      baseline: string;
      muted: string;
      confidenceBand: string;
    };
  };
}

/**
 * Core contract for a Bespoke Visual Framework.
 * A framework encapsulates a fixed, carefully authored visual composition
 * where structured research data is injected and rendered to SVG.
 */
export interface VisualFramework<TData = unknown, TConfig = Record<string, unknown>> {
  /** Unique identifier (kebab-case), e.g., "raincloud-horizon-comparison" */
  id: string;
  /** Human-readable framework name */
  name: string;
  /** Research domain or analytical category */
  category: string;
  /** Architectural summary of the visual encoding and when to use it */
  description: string;
  /** Default SVG artboard dimensions and margins */
  defaultDimensions: FigureDimensions;
  /** Default editorial metadata */
  defaultMetadata: FigureMetadata;
  /** Default configuration parameters */
  defaultConfig: TConfig;
  /** Declarative list of tunable framework parameters */
  parameters: FrameworkParameterSchema<TConfig>[];
  /** Curated default dataset demonstrating the framework */
  sampleData: TData;
  /** Human-readable description or TypeScript-like schema of expected data shape */
  dataSchemaDescription: string;
  /** Validates and parses raw injected data into TData */
  validateData: (raw: unknown) => DataValidationResult<TData>;
  /** The SVG graphic composition component (renders inside `<svg>`) */
  Component: React.ComponentType<FrameworkRenderProps<TData, TConfig>>;
}

export function computePlotBounds(dimensions: FigureDimensions): PlotBounds {
  const { width, height, margin } = dimensions;
  return {
    width,
    height,
    margin,
    innerWidth: Math.max(0, width - margin.left - margin.right),
    innerHeight: Math.max(0, height - margin.top - margin.bottom),
  };
}
