import React from 'react';
import * as d3 from 'd3';
import type { DataValidationResult, FrameworkRenderProps, VisualFramework } from '../core/types';

export interface KaplanMeierTimepoint {
  time: number;
  arm: string;
  survivalRate: number;
  ciLower: number;
  ciUpper: number;
  nAtRisk: number;
  nEvents: number;
  nCensored: number;
}

export interface KaplanMeierConfig {
  timeUnit: string;
  showConfidenceBands: boolean;
  showCensoredTicks: boolean;
  medianThresholdLine: boolean;
}

const SAMPLE_KM_DATA: KaplanMeierTimepoint[] = [
  // Arm A: Experimental Immunotherapy
  { time: 0, arm: 'Investigational Tri-Specific (n=320)', survivalRate: 1.0, ciLower: 1.0, ciUpper: 1.0, nAtRisk: 320, nEvents: 0, nCensored: 0 },
  { time: 3, arm: 'Investigational Tri-Specific (n=320)', survivalRate: 0.94, ciLower: 0.91, ciUpper: 0.96, nAtRisk: 301, nEvents: 18, nCensored: 1 },
  { time: 6, arm: 'Investigational Tri-Specific (n=320)', survivalRate: 0.88, ciLower: 0.84, ciUpper: 0.91, nAtRisk: 280, nEvents: 19, nCensored: 2 },
  { time: 9, arm: 'Investigational Tri-Specific (n=320)', survivalRate: 0.81, ciLower: 0.76, ciUpper: 0.85, nAtRisk: 257, nEvents: 21, nCensored: 2 },
  { time: 12, arm: 'Investigational Tri-Specific (n=320)', survivalRate: 0.75, ciLower: 0.70, ciUpper: 0.79, nAtRisk: 236, nEvents: 18, nCensored: 3 },
  { time: 18, arm: 'Investigational Tri-Specific (n=320)', survivalRate: 0.67, ciLower: 0.61, ciUpper: 0.72, nAtRisk: 208, nEvents: 24, nCensored: 4 },
  { time: 24, arm: 'Investigational Tri-Specific (n=320)', survivalRate: 0.61, ciLower: 0.55, ciUpper: 0.66, nAtRisk: 184, nEvents: 18, nCensored: 6 },
  { time: 30, arm: 'Investigational Tri-Specific (n=320)', survivalRate: 0.56, ciLower: 0.50, ciUpper: 0.62, nAtRisk: 162, nEvents: 14, nCensored: 8 },
  { time: 36, arm: 'Investigational Tri-Specific (n=320)', survivalRate: 0.52, ciLower: 0.46, ciUpper: 0.58, nAtRisk: 138, nEvents: 11, nCensored: 13 },

  // Arm B: Standard of Care (Chemotherapy)
  { time: 0, arm: 'Standard of Care Control (n=320)', survivalRate: 1.0, ciLower: 1.0, ciUpper: 1.0, nAtRisk: 320, nEvents: 0, nCensored: 0 },
  { time: 3, arm: 'Standard of Care Control (n=320)', survivalRate: 0.87, ciLower: 0.83, ciUpper: 0.90, nAtRisk: 278, nEvents: 41, nCensored: 1 },
  { time: 6, arm: 'Standard of Care Control (n=320)', survivalRate: 0.74, ciLower: 0.69, ciUpper: 0.78, nAtRisk: 234, nEvents: 42, nCensored: 2 },
  { time: 9, arm: 'Standard of Care Control (n=320)', survivalRate: 0.61, ciLower: 0.55, ciUpper: 0.66, nAtRisk: 192, nEvents: 39, nCensored: 3 },
  { time: 12, arm: 'Standard of Care Control (n=320)', survivalRate: 0.48, ciLower: 0.42, ciUpper: 0.53, nAtRisk: 151, nEvents: 38, nCensored: 3 },
  { time: 18, arm: 'Standard of Care Control (n=320)', survivalRate: 0.35, ciLower: 0.30, ciUpper: 0.40, nAtRisk: 108, nEvents: 40, nCensored: 3 },
  { time: 24, arm: 'Standard of Care Control (n=320)', survivalRate: 0.25, ciLower: 0.20, ciUpper: 0.30, nAtRisk: 74, nEvents: 30, nCensored: 4 },
  { time: 30, arm: 'Standard of Care Control (n=320)', survivalRate: 0.18, ciLower: 0.14, ciUpper: 0.23, nAtRisk: 51, nEvents: 19, nCensored: 4 },
  { time: 36, arm: 'Standard of Care Control (n=320)', survivalRate: 0.14, ciLower: 0.10, ciUpper: 0.18, nAtRisk: 35, nEvents: 10, nCensored: 6 },
];

function validateKaplanMeier(raw: unknown): DataValidationResult<KaplanMeierTimepoint[]> {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { valid: false, errors: ['Expected array of Kaplan-Meier timepoint records.'] };
  }
  const validated = raw.map((r) => ({
    time: Number(r.time ?? 0),
    arm: String(r.arm ?? 'Cohort'),
    survivalRate: Number(r.survivalRate ?? 1),
    ciLower: Number(r.ciLower ?? r.survivalRate),
    ciUpper: Number(r.ciUpper ?? r.survivalRate),
    nAtRisk: Number(r.nAtRisk ?? 0),
    nEvents: Number(r.nEvents ?? 0),
    nCensored: Number(r.nCensored ?? 0),
  }));
  return { valid: true, data: validated, recordCount: validated.length };
}

const KaplanMeierGraphic: React.FC<FrameworkRenderProps<KaplanMeierTimepoint[], KaplanMeierConfig>> = ({
  data,
  config,
  bounds,
  theme,
}) => {
  const { innerWidth, innerHeight } = bounds;

  // Split vertical space: Upper 68% for survival curve, Lower 32% for aligned Number at Risk table
  const tableHeight = 96;
  const plotHeight = innerHeight - tableHeight - 24;

  const arms = Array.from(new Set(data.map((d) => d.arm)));
  const maxTime = d3.max(data, (d) => d.time) ?? 36;
  const distinctTimes = Array.from(new Set(data.map((d) => d.time))).sort(d3.ascending);

  const xScale = d3.scaleLinear().domain([0, maxTime]).range([40, innerWidth - 20]);
  const yScale = d3.scaleLinear().domain([0, 1]).range([plotHeight, 10]);

  const xTicks = distinctTimes;
  const yTicks = [0, 0.25, 0.5, 0.75, 1.0];

  return (
    <g className="km-framework">
      {/* Upper Curve Stage */}
      <g className="km-plot">
        {/* Y Gridlines */}
        {yTicks.map((yVal) => (
          <g key={`y-${yVal}`} transform={`translate(0, ${yScale(yVal)})`}>
            <line x1={40} x2={innerWidth - 20} stroke={theme.gridline} strokeWidth={1} strokeDasharray="3 3" />
            <text x={32} y={3.5} textAnchor="end" fill={theme.inkMuted} fontFamily={theme.fontFamilyMono} fontSize={10}>
              {(yVal * 100).toFixed(0)}%
            </text>
          </g>
        ))}

        {/* Median Survival Line (50%) */}
        {config.medianThresholdLine && (
          <line
            x1={40}
            y1={yScale(0.5)}
            x2={innerWidth - 20}
            y2={yScale(0.5)}
            stroke={theme.inkMuted}
            strokeWidth={1}
            strokeDasharray="6 4"
          />
        )}

        {/* X Gridlines */}
        {xTicks.map((t) => (
          <line
            key={`x-${t}`}
            x1={xScale(t)}
            x2={xScale(t)}
            y1={10}
            y2={plotHeight}
            stroke={theme.gridline}
            strokeWidth={0.7}
            strokeDasharray="2 2"
          />
        ))}

        {/* Survival Step Curves & Confidence Bands */}
        {arms.map((armName, aIdx) => {
          const armPoints = data.filter((d) => d.arm === armName).sort((a, b) => a.time - b.time);
          const color = theme.palette.categorical[aIdx % theme.palette.categorical.length];

          // Generate step curve path
          const pathGen = d3
            .line<KaplanMeierTimepoint>()
            .x((d) => xScale(d.time))
            .y((d) => yScale(d.survivalRate))
            .curve(d3.curveStepAfter);

          const stepPath = pathGen(armPoints) ?? '';

          // Generate confidence band area
          const areaGen = d3
            .area<KaplanMeierTimepoint>()
            .x((d) => xScale(d.time))
            .y0((d) => yScale(d.ciLower))
            .y1((d) => yScale(d.ciUpper))
            .curve(d3.curveStepAfter);

          const bandPath = areaGen(armPoints) ?? '';

          return (
            <g key={armName} className="km-arm-group">
              {config.showConfidenceBands && (
                <path d={bandPath} fill={color} fillOpacity={0.14} />
              )}
              <path d={stepPath} fill="none" stroke={color} strokeWidth={2.5} />

              {/* Censored Tick Markers */}
              {config.showCensoredTicks &&
                armPoints.map((pt, pIdx) =>
                  pt.nCensored > 0 ? (
                    <line
                      key={`${armName}-c-${pIdx}`}
                      x1={xScale(pt.time)}
                      y1={yScale(pt.survivalRate) - 4}
                      x2={xScale(pt.time)}
                      y2={yScale(pt.survivalRate) + 4}
                      stroke={color}
                      strokeWidth={1.5}
                    />
                  ) : null
                )}
            </g>
          );
        })}

        {/* Axes */}
        <line x1={40} y1={plotHeight} x2={innerWidth - 20} y2={plotHeight} stroke={theme.axisLine} strokeWidth={1.2} />
        <line x1={40} y1={10} x2={40} y2={plotHeight} stroke={theme.axisLine} strokeWidth={1.2} />

        {/* Y Axis Label */}
        <text
          transform={`translate(12, ${plotHeight / 2}) rotate(-90)`}
          textAnchor="middle"
          fill={theme.inkSecondary}
          fontSize={11}
          fontWeight={600}
        >
          Overall Survival Probability (%)
        </text>

        {/* Floating Inset Legend & Log-Rank Stats */}
        <g transform={`translate(${innerWidth - 270}, 24)`}>
          <rect width={245} height={76} rx={4} fill={theme.background} stroke={theme.gridline} strokeWidth={1} />
          {arms.map((armName, aIdx) => (
            <g key={armName} transform={`translate(12, ${18 + aIdx * 20})`}>
              <line x1={0} y1={0} x2={16} y2={0} stroke={theme.palette.categorical[aIdx]} strokeWidth={2.5} />
              <text x={22} y={3.5} fill={theme.inkPrimary} fontSize={10.5} fontWeight={500}>
                {armName}
              </text>
            </g>
          ))}
          <text x={12} y={64} fill={theme.accentPrimary} fontFamily={theme.fontFamilyMono} fontSize={9.5} fontWeight={700}>
            HR = 0.44 [95% CI: 0.35–0.56] · P &lt; 0.0001
          </text>
        </g>
      </g>

      {/* Lower Aligned Number-at-Risk Table */}
      <g className="km-risk-table" transform={`translate(0, ${plotHeight + 20})`}>
        <text x={40} y={0} fill={theme.inkSecondary} fontFamily={theme.fontFamilyMono} fontSize={9.5} fontWeight={700}>
          NUMBER AT RISK ({config.timeUnit.toUpperCase()})
        </text>
        <line x1={40} y1={6} x2={innerWidth - 20} y2={6} stroke={theme.inkPrimary} strokeWidth={1} />

        {/* Time column headers */}
        {distinctTimes.map((t) => (
          <text
            key={`tbl-t-${t}`}
            x={xScale(t)}
            y={18}
            textAnchor="middle"
            fill={theme.inkMuted}
            fontFamily={theme.fontFamilyMono}
            fontSize={9.5}
          >
            {t} {config.timeUnit}
          </text>
        ))}

        {/* Rows per arm */}
        {arms.map((armName, aIdx) => {
          const armPoints = data.filter((d) => d.arm === armName);
          const color = theme.palette.categorical[aIdx % theme.palette.categorical.length];
          const rowY = 36 + aIdx * 22;

          return (
            <g key={`tbl-arm-${armName}`}>
              <rect x={40} y={rowY - 13} width={4} height={14} fill={color} />
              <text x={48} y={-2 + rowY} fill={theme.inkPrimary} fontSize={10} fontWeight={600}>
                {armName.split(' ')[0]}
              </text>

              {distinctTimes.map((t) => {
                const pt = armPoints.find((p) => p.time === t);
                return (
                  <text
                    key={`risk-${armName}-${t}`}
                    x={xScale(t)}
                    y={rowY}
                    textAnchor="middle"
                    fill={theme.inkPrimary}
                    fontFamily={theme.fontFamilyMono}
                    fontSize={10}
                    fontWeight={500}
                  >
                    {pt ? pt.nAtRisk : '—'}
                  </text>
                );
              })}
            </g>
          );
        })}
      </g>
    </g>
  );
};

export const kaplanMeierFramework: VisualFramework<KaplanMeierTimepoint[], KaplanMeierConfig> = {
  id: 'kaplan-meier-risk-table',
  name: 'Kaplan-Meier Survival with Number-at-Risk Grid',
  category: 'Clinical Oncology & Longitudinal',
  description:
    'Publication-standard step-function survival curves with shaded 95% confidence intervals, censored tick marks, hazard ratio stat badge, and vertically aligned Number-at-Risk risk table.',
  defaultDimensions: { width: 960, height: 620, margin: { top: 88, right: 36, bottom: 44, left: 36 } },
  defaultMetadata: {
    figureLabel: 'FIGURE 1 // CLINICAL OUTCOME',
    title: 'Kaplan-Meier Overall Survival Estimates by Treatment Arm',
    subtitle: 'Primary endpoint intention-to-treat population (N = 640) with 36-month prospective follow-up.',
    footnote: 'Tick marks denote right-censored patients. P-value from stratified two-sided log-rank test.',
    source: 'International Phase III Clinical Trial Consortium (Protocol ONC-301)',
    credit: 'GBG Research Engine',
  },
  defaultConfig: {
    timeUnit: 'mo',
    showConfidenceBands: true,
    showCensoredTicks: true,
    medianThresholdLine: true,
  },
  parameters: [
    { key: 'timeUnit', label: 'Time Scale Unit', type: 'text' },
    { key: 'showConfidenceBands', label: 'Display 95% Confidence Bands', type: 'boolean' },
    { key: 'showCensoredTicks', label: 'Display Censored Tick Glyphs', type: 'boolean' },
    { key: 'medianThresholdLine', label: 'Show 50% Median Survival Line', type: 'boolean' },
  ],
  sampleData: SAMPLE_KM_DATA,
  dataSchemaDescription:
    'Array of records: time (number), arm (string), survivalRate (0-1), ciLower (0-1), ciUpper (0-1), nAtRisk (number), nEvents (number), nCensored (number).',
  validateData: validateKaplanMeier,
  Component: KaplanMeierGraphic,
};
