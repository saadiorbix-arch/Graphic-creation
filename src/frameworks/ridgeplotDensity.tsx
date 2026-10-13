import React from 'react';
import * as d3 from 'd3';
import type { DataValidationResult, FrameworkRenderProps, VisualFramework } from '../core/types';

export interface RidgeBand {
  condition: string;
  orderIndex: number;
  // Discrete density samples along uniform horizontal grid
  points: { x: number; density: number }[];
}

export interface RidgeplotConfig {
  overlapRatio: number;
  strokeWidth: number;
  fillOpacity: number;
  showBaselineSeparators: boolean;
}

const SAMPLE_RIDGE_DATA: RidgeBand[] = [];
const CONDITIONS = [
  'Pre-Treatment Baseline (Day 0)',
  'Post-Infusion Induction (Day 7)',
  'Peak Clonal Expansion (Day 14)',
  'Contraction & Memory Phase (Day 28)',
  'Sustained Persistence (Day 90)',
  'Long-Term Surveillance (Day 180)',
];

const meanShifts = [12, 28, 64, 48, 36, 24];
const stdDevs = [8, 12, 16, 14, 10, 8];

CONDITIONS.forEach((cond, cIdx) => {
  const pts: { x: number; density: number }[] = [];
  const mean = meanShifts[cIdx];
  const std = stdDevs[cIdx];
  for (let x = 0; x <= 100; x += 2) {
    const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(std, 2));
    const density = (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
    pts.push({ x, density: Number(density.toFixed(5)) });
  }
  SAMPLE_RIDGE_DATA.push({
    condition: cond,
    orderIndex: cIdx,
    points: pts,
  });
});

function validateRidge(raw: unknown): DataValidationResult<RidgeBand[]> {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { valid: false, errors: ['Expected array of ridge condition bands.'] };
  }
  const validated = raw.map((r, i) => ({
    condition: String(r.condition ?? `Condition ${i}`),
    orderIndex: Number(r.orderIndex ?? i),
    points: Array.isArray(r.points)
      ? r.points.map((p: Record<string, unknown>) => ({ x: Number(p.x ?? 0), density: Number(p.density ?? 0) }))
      : [],
  }));
  return { valid: true, data: validated, recordCount: validated.length };
}

const RidgeplotGraphic: React.FC<FrameworkRenderProps<RidgeBand[], RidgeplotConfig>> = ({
  data,
  config,
  bounds,
  theme,
}) => {
  const { innerWidth, innerHeight } = bounds;

  const labelLeftW = 230;
  const plotMargin = { left: labelLeftW, right: 30, top: 25, bottom: 40 };
  const pWidth = innerWidth - plotMargin.left - plotMargin.right;
  const pHeight = innerHeight - plotMargin.top - plotMargin.bottom;

  const numBands = data.length;
  const bandStep = pHeight / (numBands + 0.5);

  const xScale = d3.scaleLinear().domain([0, 100]).range([0, pWidth]);
  const maxDensity = d3.max(data, (b) => d3.max(b.points, (p) => p.density)) ?? 0.05;

  const ridgeAmpScale = d3
    .scaleLinear()
    .domain([0, maxDensity])
    .range([0, bandStep * (1 + config.overlapRatio * 1.5)]);

  const xTicks = [0, 20, 40, 60, 80, 100];

  return (
    <g transform={`translate(${plotMargin.left}, ${plotMargin.top})`}>
      {/* Gridlines */}
      {xTicks.map((xVal) => (
        <g key={`rx-${xVal}`} transform={`translate(${xScale(xVal)}, 0)`}>
          <line y1={0} y2={pHeight} stroke={theme.gridline} strokeWidth={1} strokeDasharray="3 3" />
          <text y={pHeight + 18} textAnchor="middle" fill={theme.inkMuted} fontFamily={theme.fontFamilyMono} fontSize={10}>
            {xVal}
          </text>
        </g>
      ))}

      {/* Overlapping Ridge Density Bands (Rendered from top to bottom) */}
      {data.map((band, bIdx) => {
        const baselineY = bIdx * bandStep + bandStep;
        const color = theme.palette.categorical[bIdx % theme.palette.categorical.length];

        const areaGen = d3
          .area<{ x: number; density: number }>()
          .x((d) => xScale(d.x))
          .y0(baselineY)
          .y1((d) => baselineY - ridgeAmpScale(d.density))
          .curve(d3.curveBasis);

        const lineGen = d3
          .line<{ x: number; density: number }>()
          .x((d) => xScale(d.x))
          .y((d) => baselineY - ridgeAmpScale(d.density))
          .curve(d3.curveBasis);

        return (
          <g key={band.condition} className="ridge-layer">
            {/* Condition Label on Left */}
            <text
              x={-14}
              y={baselineY - 4}
              textAnchor="end"
              fill={theme.inkPrimary}
              fontFamily={theme.fontFamilyMono}
              fontSize={10}
              fontWeight={600}
            >
              {band.condition}
            </text>

            {/* Baseline Rule */}
            {config.showBaselineSeparators && (
              <line x1={0} x2={pWidth} y1={baselineY} y2={baselineY} stroke={theme.gridline} strokeWidth={0.8} />
            )}

            {/* Shaded Mountain Ridge */}
            <path d={areaGen(band.points) ?? ''} fill={color} fillOpacity={config.fillOpacity} />
            {/* Crest Line */}
            <path d={lineGen(band.points) ?? ''} fill="none" stroke={color} strokeWidth={config.strokeWidth} />
          </g>
        );
      })}

      {/* Axis Line */}
      <line x1={0} y1={pHeight} x2={pWidth} y2={pHeight} stroke={theme.axisLine} strokeWidth={1.2} />

      <text x={pWidth / 2} y={pHeight + 34} textAnchor="middle" fill={theme.inkSecondary} fontSize={11.5} fontWeight={600}>
        Single-Cell Activation Fluorescence Intensity (AU)
      </text>
    </g>
  );
};

export const ridgeplotFramework: VisualFramework<RidgeBand[], RidgeplotConfig> = {
  id: 'ridgeplot-temporal-density',
  name: 'Joyplot / Ridgeline Temporal Density Cascade',
  category: 'Continuous Densities & Flow Dynamics',
  description:
    'Cascading joyplot / ridgeline chart visualizing continuous density distributions across longitudinal or experimental conditions with overlapping vertical crests and baseline anchors.',
  defaultDimensions: { width: 940, height: 600, margin: { top: 88, right: 36, bottom: 44, left: 36 } },
  defaultMetadata: {
    figureLabel: 'FIGURE 9 // LONGITUDINAL DENSITY EVOLUTION',
    title: 'Clonal Activation Distribution Across Time-Course Stages',
    subtitle: 'Flow cytometry single-cell distribution curves tracked from Day 0 baseline through Day 180 surveillance.',
    footnote: 'Ridge elevations represent kernel density estimates. Overlapping amplitudes scaled by 1.2x bandwidth multiplier.',
    source: 'Cellular Immunotherapy Monitoring Protocol (N = 10,000 single cells per timepoint)',
    credit: 'GBG Research Engine',
  },
  defaultConfig: {
    overlapRatio: 1.2,
    strokeWidth: 2.2,
    fillOpacity: 0.38,
    showBaselineSeparators: true,
  },
  parameters: [
    { key: 'overlapRatio', label: 'Vertical Overlap Factor', type: 'number', min: 0.5, max: 2.5, step: 0.1 },
    { key: 'strokeWidth', label: 'Crest Stroke Width (px)', type: 'number', min: 1.0, max: 4.0, step: 0.5 },
    { key: 'fillOpacity', label: 'Area Fill Opacity', type: 'number', min: 0.15, max: 0.85, step: 0.05 },
    { key: 'showBaselineSeparators', label: 'Draw Baseline Gridlines', type: 'boolean' },
  ],
  sampleData: SAMPLE_RIDGE_DATA,
  dataSchemaDescription:
    'Array of condition records: condition (string), orderIndex (number), points (array of { x: number, density: number }).',
  validateData: validateRidge,
  Component: RidgeplotGraphic,
};
