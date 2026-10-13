import React from 'react';
import * as d3 from 'd3';
import type { DataValidationResult, FrameworkRenderProps, VisualFramework } from '../core/types';

export interface PhenotypeProfile {
  cohortName: string;
  category: string;
  isKeyHighlight: boolean;
  // Standardized clinical scores across 6 orthogonal dimensions (0 to 100)
  cardiacOutput: number;
  vascularResistance: number;
  renalClearance: number;
  inflammatoryIndex: number;
  glycemicVariability: number;
  neuroCognitiveScore: number;
}

export interface ParallelCoordinatesConfig {
  strokeWidth: number;
  unselectedOpacity: number;
  showAxisQuartileBands: boolean;
}

const DIMENSIONS: { key: keyof PhenotypeProfile; label: string; unit: string }[] = [
  { key: 'cardiacOutput', label: 'Cardiac Output', unit: 'L/min' },
  { key: 'vascularResistance', label: 'Vasc. Resistance', unit: 'dyn·s/cm⁵' },
  { key: 'renalClearance', label: 'Renal Clearance', unit: 'mL/min/1.73m²' },
  { key: 'inflammatoryIndex', label: 'Inflammatory Index', unit: 'hsCRP pts' },
  { key: 'glycemicVariability', label: 'Glycemic Var.', unit: '% CV' },
  { key: 'neuroCognitiveScore', label: 'Cognitive Composite', unit: 'MoCA norm' },
];

const SAMPLE_PHENOTYPES: PhenotypeProfile[] = [
  { cohortName: 'Cardiometabolic Syndrome (Decompensated)', category: 'High Risk', isKeyHighlight: true, cardiacOutput: 32, vascularResistance: 88, renalClearance: 36, inflammatoryIndex: 91, glycemicVariability: 84, neuroCognitiveScore: 42 },
  { cohortName: 'Early Vascular Aging Phenotype', category: 'Moderate Risk', isKeyHighlight: true, cardiacOutput: 54, vascularResistance: 76, renalClearance: 68, inflammatoryIndex: 58, glycemicVariability: 62, neuroCognitiveScore: 68 },
  { cohortName: 'Healthy Age-Matched Normative Controls', category: 'Low Risk', isKeyHighlight: true, cardiacOutput: 78, vascularResistance: 34, renalClearance: 89, inflammatoryIndex: 18, glycemicVariability: 24, neuroCognitiveScore: 92 },
  { cohortName: 'Isolated Renovascular Hypertension', category: 'Subgroup', isKeyHighlight: false, cardiacOutput: 62, vascularResistance: 82, renalClearance: 44, inflammatoryIndex: 45, glycemicVariability: 38, neuroCognitiveScore: 75 },
  { cohortName: 'Systemic Autoimmune Vasculitis', category: 'Subgroup', isKeyHighlight: false, cardiacOutput: 58, vascularResistance: 65, renalClearance: 52, inflammatoryIndex: 88, glycemicVariability: 46, neuroCognitiveScore: 61 },
  { cohortName: 'Metabolically Healthy Obesity', category: 'Subgroup', isKeyHighlight: false, cardiacOutput: 72, vascularResistance: 48, renalClearance: 76, inflammatoryIndex: 38, glycemicVariability: 42, neuroCognitiveScore: 82 },
  { cohortName: 'Frailty & Cognitive Decline Cluster', category: 'Subgroup', isKeyHighlight: false, cardiacOutput: 42, vascularResistance: 58, renalClearance: 48, inflammatoryIndex: 64, glycemicVariability: 55, neuroCognitiveScore: 31 },
];

function validateParallelCoords(raw: unknown): DataValidationResult<PhenotypeProfile[]> {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { valid: false, errors: ['Expected array of multidimensional phenotype records.'] };
  }
  const validated = raw.map((r) => ({
    cohortName: String(r.cohortName ?? 'Cohort'),
    category: String(r.category ?? 'General'),
    isKeyHighlight: Boolean(r.isKeyHighlight ?? false),
    cardiacOutput: Number(r.cardiacOutput ?? 50),
    vascularResistance: Number(r.vascularResistance ?? 50),
    renalClearance: Number(r.renalClearance ?? 50),
    inflammatoryIndex: Number(r.inflammatoryIndex ?? 50),
    glycemicVariability: Number(r.glycemicVariability ?? 50),
    neuroCognitiveScore: Number(r.neuroCognitiveScore ?? 50),
  }));
  return { valid: true, data: validated, recordCount: validated.length };
}

const ParallelCoordinatesGraphic: React.FC<FrameworkRenderProps<PhenotypeProfile[], ParallelCoordinatesConfig>> = ({
  data,
  config,
  bounds,
  theme,
}) => {
  const { innerWidth, innerHeight } = bounds;

  const plotMargin = { left: 40, right: 40, top: 38, bottom: 45 };
  const pWidth = innerWidth - plotMargin.left - plotMargin.right;
  const pHeight = innerHeight - plotMargin.top - plotMargin.bottom;

  const axisSpacing = pWidth / (DIMENSIONS.length - 1);
  const yScale = d3.scaleLinear().domain([0, 100]).range([pHeight, 0]);

  const yTicks = [0, 25, 50, 75, 100];

  return (
    <g transform={`translate(${plotMargin.left}, ${plotMargin.top})`}>
      {/* Interquartile Background Band across All Axes */}
      {config.showAxisQuartileBands && (
        <rect
          x={0}
          y={yScale(75)}
          width={pWidth}
          height={yScale(25) - yScale(75)}
          fill="url(#pattern-dots)"
        />
      )}

      {/* Vertical Axis Columns */}
      {DIMENSIONS.map((dim, i) => {
        const axX = i * axisSpacing;
        return (
          <g key={String(dim.key)} transform={`translate(${axX}, 0)`}>
            {/* Axis Spines */}
            <line y1={0} y2={pHeight} stroke={theme.axisLine} strokeWidth={1.2} />

            {/* Axis Ticks */}
            {yTicks.map((tickVal) => (
              <g key={`t-${tickVal}`} transform={`translate(0, ${yScale(tickVal)})`}>
                <line x1={-4} x2={4} stroke={theme.inkMuted} strokeWidth={1} />
                {i === 0 && (
                  <text x={-8} y={3.5} textAnchor="end" fill={theme.inkMuted} fontFamily={theme.fontFamilyMono} fontSize={9}>
                    {tickVal}
                  </text>
                )}
              </g>
            ))}

            {/* Top Axis Label */}
            <text
              x={0}
              y={-18}
              textAnchor="middle"
              fill={theme.inkPrimary}
              fontFamily={theme.fontFamilyMono}
              fontSize={10}
              fontWeight={700}
            >
              {dim.label.toUpperCase()}
            </text>
            <text
              x={0}
              y={-6}
              textAnchor="middle"
              fill={theme.inkMuted}
              fontSize={8.5}
            >
              [{dim.unit}]
            </text>
          </g>
        );
      })}

      {/* Cohort Trajectory Polylines */}
      {data.map((cohort, cIdx) => {
        const isHighlight = cohort.isKeyHighlight;
        const color = isHighlight
          ? theme.palette.categorical[cIdx % theme.palette.categorical.length]
          : theme.palette.significance.muted;

        const points: [number, number][] = DIMENSIONS.map((dim, i) => {
          const val = Number(cohort[dim.key]);
          return [i * axisSpacing, yScale(val)];
        });

        const lineGen = d3.line().curve(d3.curveMonotoneX);

        return (
          <g key={cohort.cohortName} className="parallel-cohort-track">
            <path
              d={lineGen(points) ?? ''}
              fill="none"
              stroke={color}
              strokeWidth={isHighlight ? config.strokeWidth : 1.2}
              strokeOpacity={isHighlight ? 0.95 : config.unselectedOpacity}
            />

            {/* Endpoint Node Anchors */}
            {points.map(([px, py], pIdx) => (
              <circle
                key={`pt-${pIdx}`}
                cx={px}
                cy={py}
                r={isHighlight ? 4 : 2}
                fill={color}
                stroke={theme.background}
                strokeWidth={1}
              />
            ))}
          </g>
        );
      })}

      {/* Interactive Legend Below */}
      <g transform={`translate(0, ${pHeight + 24})`}>
        {data.filter((d) => d.isKeyHighlight).map((cohort, hIdx) => {
          const color = theme.palette.categorical[hIdx % theme.palette.categorical.length];
          return (
            <g key={cohort.cohortName} transform={`translate(${hIdx * 280}, 0)`}>
              <line x1={0} y1={0} x2={16} y2={0} stroke={color} strokeWidth={2.5} />
              <text x={22} y={3.5} fill={theme.inkPrimary} fontSize={10} fontWeight={600}>
                {cohort.cohortName}
              </text>
            </g>
          );
        })}
      </g>
    </g>
  );
};

export const parallelCoordinatesFramework: VisualFramework<PhenotypeProfile[], ParallelCoordinatesConfig> = {
  id: 'parallel-phenotype-coordinates',
  name: 'Multidimensional Parallel Coordinate Phenotypes',
  category: 'High-Dimensional Phenotyping',
  description:
    'Continuous multiaxial parallel coordinate profiles mapping individuals and clinical cohorts across 6 orthogonal physiological dimensions with normative quartile bands and highlight tracks.',
  defaultDimensions: { width: 980, height: 580, margin: { top: 88, right: 36, bottom: 44, left: 36 } },
  defaultMetadata: {
    figureLabel: 'FIGURE 7 // PHENOTYPIC CLUSTERING',
    title: 'Multisystem Physiological Phenotypes Across Chronic Cohorts',
    subtitle: 'Standardized profile curves normalized across 6 cardiovascular, metabolic, and neurocognitive domains.',
    footnote: 'Central shaded strip designates the 25th–75th interquartile normative population range. Normalized 0–100 scale.',
    source: 'Prospective Longitudinal Cohort Registry — Cardiovascular Health Study',
    credit: 'GBG Research Engine',
  },
  defaultConfig: {
    strokeWidth: 2.6,
    unselectedOpacity: 0.28,
    showAxisQuartileBands: true,
  },
  parameters: [
    { key: 'strokeWidth', label: 'Highlight Trajectory Width (px)', type: 'number', min: 1.5, max: 4.5, step: 0.5 },
    { key: 'unselectedOpacity', label: 'Background Line Opacity', type: 'number', min: 0.1, max: 0.6, step: 0.05 },
    { key: 'showAxisQuartileBands', label: 'Shade Normative IQR Band', type: 'boolean' },
  ],
  sampleData: SAMPLE_PHENOTYPES,
  dataSchemaDescription:
    'Array of records: cohortName (string), category (string), isKeyHighlight (boolean), and 6 numeric metrics (0-100): cardiacOutput, vascularResistance, renalClearance, inflammatoryIndex, glycemicVariability, neuroCognitiveScore.',
  validateData: validateParallelCoords,
  Component: ParallelCoordinatesGraphic,
};
