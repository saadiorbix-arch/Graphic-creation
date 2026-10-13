import React from 'react';
import * as d3 from 'd3';
import type { DataValidationResult, FrameworkRenderProps, VisualFramework } from '../core/types';

export interface TrialBiasEntry {
  studyId: string;
  firstAuthor: string;
  year: number;
  sampleSize: number;
  effectOddsRatio: number;
  logEffectDelta: number;
  standardError: number;
  riskOfBias: 'Low' | 'Moderate' | 'High';
}

export interface FunnelBiasConfig {
  pooledEffectDelta: number;
  showP95Envelope: boolean;
  showP99Envelope: boolean;
  scaleBySampleSize: boolean;
}

const SAMPLE_BIAS_DATA: TrialBiasEntry[] = [
  { studyId: 'STUDY-01', firstAuthor: 'Alvarez et al.', year: 2021, sampleSize: 1240, effectOddsRatio: 1.54, logEffectDelta: 0.43, standardError: 0.08, riskOfBias: 'Low' },
  { studyId: 'STUDY-02', firstAuthor: 'Bhatia et al.', year: 2022, sampleSize: 890, effectOddsRatio: 1.62, logEffectDelta: 0.48, standardError: 0.11, riskOfBias: 'Low' },
  { studyId: 'STUDY-03', firstAuthor: 'Chen et al.', year: 2020, sampleSize: 450, effectOddsRatio: 1.48, logEffectDelta: 0.39, standardError: 0.16, riskOfBias: 'Moderate' },
  { studyId: 'STUDY-04', firstAuthor: 'Dumont et al.', year: 2023, sampleSize: 310, effectOddsRatio: 1.85, logEffectDelta: 0.61, standardError: 0.22, riskOfBias: 'Moderate' },
  { studyId: 'STUDY-05', firstAuthor: 'Espinosa et al.', year: 2019, sampleSize: 180, effectOddsRatio: 2.15, logEffectDelta: 0.76, standardError: 0.31, riskOfBias: 'High' },
  { studyId: 'STUDY-06', firstAuthor: 'Fischer et al.', year: 2024, sampleSize: 760, effectOddsRatio: 1.51, logEffectDelta: 0.41, standardError: 0.12, riskOfBias: 'Low' },
  { studyId: 'STUDY-07', firstAuthor: 'Gomez et al.', year: 2021, sampleSize: 220, effectOddsRatio: 2.45, logEffectDelta: 0.89, standardError: 0.36, riskOfBias: 'High' },
  { studyId: 'STUDY-08', firstAuthor: 'Hansen et al.', year: 2022, sampleSize: 520, effectOddsRatio: 1.58, logEffectDelta: 0.45, standardError: 0.15, riskOfBias: 'Low' },
  { studyId: 'STUDY-09', firstAuthor: 'Ito et al.', year: 2020, sampleSize: 140, effectOddsRatio: 1.95, logEffectDelta: 0.67, standardError: 0.38, riskOfBias: 'High' },
  { studyId: 'STUDY-10', firstAuthor: 'Jensen et al.', year: 2023, sampleSize: 640, effectOddsRatio: 1.45, logEffectDelta: 0.37, standardError: 0.14, riskOfBias: 'Low' },
  { studyId: 'STUDY-11', firstAuthor: 'Kowalski et al.', year: 2021, sampleSize: 160, effectOddsRatio: 0.82, logEffectDelta: -0.19, standardError: 0.35, riskOfBias: 'Moderate' },
  { studyId: 'STUDY-12', firstAuthor: 'Larsson et al.', year: 2024, sampleSize: 380, effectOddsRatio: 1.68, logEffectDelta: 0.52, standardError: 0.19, riskOfBias: 'Low' },
];

function validateFunnel(raw: unknown): DataValidationResult<TrialBiasEntry[]> {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { valid: false, errors: ['Expected array of meta-analysis trial entries.'] };
  }
  const validated = raw.map((r, i) => ({
    studyId: String(r.studyId ?? `Trial-${i}`),
    firstAuthor: String(r.firstAuthor ?? 'Author et al.'),
    year: Number(r.year ?? 2022),
    sampleSize: Number(r.sampleSize ?? 100),
    effectOddsRatio: Number(r.effectOddsRatio ?? 1.5),
    logEffectDelta: Number(r.logEffectDelta ?? 0.4),
    standardError: Number(r.standardError ?? 0.2),
    riskOfBias: (r.riskOfBias === 'Low' || r.riskOfBias === 'Moderate' || r.riskOfBias === 'High' ? r.riskOfBias : 'Moderate') as 'Low' | 'Moderate' | 'High',
  }));
  return { valid: true, data: validated, recordCount: validated.length };
}

const FunnelBiasGraphic: React.FC<FrameworkRenderProps<TrialBiasEntry[], FunnelBiasConfig>> = ({
  data,
  config,
  bounds,
  theme,
}) => {
  const { innerWidth, innerHeight } = bounds;

  const plotMargin = { left: 45, right: 35, top: 20, bottom: 45 };
  const pWidth = innerWidth - plotMargin.left - plotMargin.right;
  const pHeight = innerHeight - plotMargin.top - plotMargin.bottom;

  const maxSE = 0.5;
  const xScale = d3.scaleLinear().domain([-0.8, 1.4]).range([0, pWidth]);
  // Standard error on Y-axis is conventionally inverted (0 at top = largest, highest precision studies)
  const yScale = d3.scaleLinear().domain([0, maxSE]).range([0, pHeight]);

  const xTicks = [-0.6, -0.3, 0, 0.3, 0.6, 0.9, 1.2];
  const yTicks = [0, 0.1, 0.2, 0.3, 0.4, 0.5];

  const pooledX = xScale(config.pooledEffectDelta);

  // Funnel envelope coordinates: x = pooledEffect ± 1.96 * SE (95%) and ± 2.58 * SE (99%)
  const seBottom = maxSE;
  const left95_Bottom = xScale(config.pooledEffectDelta - 1.96 * seBottom);
  const right95_Bottom = xScale(config.pooledEffectDelta + 1.96 * seBottom);

  const left99_Bottom = xScale(config.pooledEffectDelta - 2.58 * seBottom);
  const right99_Bottom = xScale(config.pooledEffectDelta + 2.58 * seBottom);

  const rScale = d3.scaleSqrt().domain([100, 1500]).range([4.5, 9.5]);

  return (
    <g transform={`translate(${plotMargin.left}, ${plotMargin.top})`}>
      {/* Pseudo-99% Confidence Funnel (Outer Hatched Shading) */}
      {config.showP99Envelope && (
        <polygon
          points={`${pooledX},0 ${right99_Bottom},${pHeight} ${left99_Bottom},${pHeight}`}
          fill={theme.gridline}
          fillOpacity={0.25}
        />
      )}

      {/* Pseudo-95% Confidence Funnel (Inner Clear Region) */}
      {config.showP95Envelope && (
        <polygon
          points={`${pooledX},0 ${right95_Bottom},${pHeight} ${left95_Bottom},${pHeight}`}
          fill={theme.background}
          stroke={theme.inkPrimary}
          strokeWidth={1.2}
          strokeDasharray="4 3"
        />
      )}

      {/* Gridlines */}
      {xTicks.map((xVal) => (
        <g key={`fx-${xVal}`} transform={`translate(${xScale(xVal)}, 0)`}>
          <line y1={0} y2={pHeight} stroke={theme.gridline} strokeWidth={1} strokeDasharray="3 3" />
          <text y={pHeight + 18} textAnchor="middle" fill={theme.inkMuted} fontFamily={theme.fontFamilyMono} fontSize={10}>
            {xVal}
          </text>
        </g>
      ))}

      {yTicks.map((yVal) => (
        <g key={`fy-${yVal}`} transform={`translate(0, ${yScale(yVal)})`}>
          <line x1={0} x2={pWidth} stroke={theme.gridline} strokeWidth={1} strokeDasharray="3 3" />
          <text x={-8} y={3.5} textAnchor="end" fill={theme.inkMuted} fontFamily={theme.fontFamilyMono} fontSize={10}>
            {yVal.toFixed(2)}
          </text>
        </g>
      ))}

      {/* Central Pooled Effect Line */}
      <line x1={pooledX} x2={pooledX} y1={0} y2={pHeight} stroke={theme.accentPrimary} strokeWidth={2} />

      {/* No-effect Line (0.0) */}
      <line x1={xScale(0)} x2={xScale(0)} y1={0} y2={pHeight} stroke={theme.axisLine} strokeWidth={1} strokeDasharray="6 4" />

      {/* Axes */}
      <line x1={0} y1={pHeight} x2={pWidth} y2={pHeight} stroke={theme.axisLine} strokeWidth={1.2} />
      <line x1={0} y1={0} x2={0} y2={pHeight} stroke={theme.axisLine} strokeWidth={1.2} />

      {/* Trial Points */}
      {data.map((trial) => {
        const cx = xScale(trial.logEffectDelta);
        const cy = yScale(trial.standardError);
        const r = config.scaleBySampleSize ? rScale(trial.sampleSize) : 6;
        const color =
          trial.riskOfBias === 'Low'
            ? theme.palette.categorical[0]
            : trial.riskOfBias === 'Moderate'
            ? theme.palette.categorical[4]
            : theme.palette.categorical[1];

        return (
          <g key={trial.studyId}>
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill={color}
              stroke={theme.background}
              strokeWidth={1.2}
            />
            {/* Study Callout */}
            <text
              x={cx + r + 4}
              y={cy + 3}
              fill={theme.inkPrimary}
              fontFamily={theme.fontFamilyMono}
              fontSize={8.5}
              filter="url(#filter-text-halo)"
            >
              {trial.firstAuthor} ({trial.year})
            </text>
          </g>
        );
      })}

      {/* Axis Labels */}
      <text x={pWidth / 2} y={pHeight + 36} textAnchor="middle" fill={theme.inkSecondary} fontSize={11.5} fontWeight={600}>
        Log Treatment Effect ln(OR) — [0 = Null No Effect]
      </text>
      <text
        transform={`translate(-30, ${pHeight / 2}) rotate(-90)`}
        textAnchor="middle"
        fill={theme.inkSecondary}
        fontSize={11.5}
        fontWeight={600}
      >
        Standard Error SE (Precision) → Inverted (Top = Highest Precision)
      </text>

      {/* Legend Inset */}
      <g transform={`translate(${pWidth - 190}, 16)`}>
        <rect width={180} height={70} rx={3} fill={theme.background} stroke={theme.gridline} strokeWidth={1} />
        <circle cx={14} cy={16} r={4.5} fill={theme.palette.categorical[0]} />
        <text x={24} y={19} fill={theme.inkPrimary} fontSize={9.5}>Low Risk of Bias (Cochrane)</text>
        <circle cx={14} cy={34} r={4.5} fill={theme.palette.categorical[4]} />
        <text x={24} y={37} fill={theme.inkPrimary} fontSize={9.5}>Moderate Risk of Bias</text>
        <circle cx={14} cy={52} r={4.5} fill={theme.palette.categorical[1]} />
        <text x={24} y={55} fill={theme.inkPrimary} fontSize={9.5}>High Risk of Bias</text>
      </g>
    </g>
  );
};

export const funnelBiasFramework: VisualFramework<TrialBiasEntry[], FunnelBiasConfig> = {
  id: 'funnel-publication-bias',
  name: 'Contour-Enhanced Funnel Plot for Evidence Bias',
  category: 'Meta-Analysis & Evidence Synthesis',
  description:
    'Publication-standard contour-enhanced funnel plot mapping trial log-odds against inverted standard error to evaluate small-study effects and publication asymmetry with 95% and 99% pseudo-confidence limits.',
  defaultDimensions: { width: 920, height: 600, margin: { top: 88, right: 36, bottom: 44, left: 36 } },
  defaultMetadata: {
    figureLabel: 'FIGURE 8 // EVIDENCE SYNTHESIS',
    title: 'Funnel Plot of Trial Precision vs. Reported Effect Estimates',
    subtitle: 'Systematic review of 12 randomized controlled trials evaluated for publication bias and asymmetry.',
    footnote: 'Dashed boundaries reflect pseudo-95% confidence intervals around the pooled meta-analytic effect (ln OR = +0.42).',
    source: 'Cochrane Collaboration Systematic Review Repository',
    credit: 'GBG Research Engine',
  },
  defaultConfig: {
    pooledEffectDelta: 0.42,
    showP95Envelope: true,
    showP99Envelope: true,
    scaleBySampleSize: true,
  },
  parameters: [
    { key: 'pooledEffectDelta', label: 'Pooled Meta-Analytic Effect', type: 'number', min: -0.5, max: 1.0, step: 0.05 },
    { key: 'showP95Envelope', label: 'Show 95% Confidence Funnel', type: 'boolean' },
    { key: 'showP99Envelope', label: 'Show 99% Contour Shading', type: 'boolean' },
    { key: 'scaleBySampleSize', label: 'Scale Circles by Sample Size (√N)', type: 'boolean' },
  ],
  sampleData: SAMPLE_BIAS_DATA,
  dataSchemaDescription:
    'Array of records: studyId (string), firstAuthor (string), year (number), sampleSize (number), effectOddsRatio (number), logEffectDelta (number), standardError (number), riskOfBias ("Low" | "Moderate" | "High").',
  validateData: validateFunnel,
  Component: FunnelBiasGraphic,
};
