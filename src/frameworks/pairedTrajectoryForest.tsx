import React from 'react';
import * as d3 from 'd3';
import type {
  DataValidationResult,
  FrameworkRenderProps,
  VisualFramework,
} from '../core/types';

/**
 * Data record contract for the Paired Trajectory & Treatment Effect Forest Framework.
 */
export interface PairedCohortRecord {
  /** Subgroup or cohort identifier (e.g., "Age ≥ 65 (High Risk)") */
  cohort: string;
  /** Broad stratification group (e.g., "Clinical Severity", "Demographics", "Biomarker") */
  domain: string;
  /** Sample size in subgroup */
  n: number;
  /** Control / Baseline group mean */
  controlMean: number;
  /** Intervention / Treatment group mean */
  treatmentMean: number;
  /** Net treatment effect (Treatment - Control) */
  effectDelta: number;
  /** Lower bound of 95% confidence interval for effectDelta */
  ciLower: number;
  /** Upper bound of 95% confidence interval for effectDelta */
  ciUpper: number;
  /** Two-sided p-value for subgroup treatment effect */
  pValue: number;
}

export interface PairedTrajectoryConfig {
  /** Primary metric unit label */
  metricUnit: string;
  /** Minimum Clinically Important Difference (MCID) threshold (hatched zone around 0) */
  mcidThreshold: number;
  /** Sort order for cohorts */
  sortOrder: 'original' | 'effectDesc' | 'effectAsc' | 'sampleSize';
  /** Show sample size proportional circles on baseline/treatment endpoints */
  scalePointsBySampleSize: boolean;
  /** Show direct numeric labels above points */
  showDirectValueLabels: boolean;
}

const SAMPLE_COHORT_DATA: PairedCohortRecord[] = [
  {
    cohort: 'Overall Intention-to-Treat (ITT)',
    domain: 'Primary Endpoint',
    n: 1420,
    controlMean: 41.2,
    treatmentMean: 56.8,
    effectDelta: 15.6,
    ciLower: 12.8,
    ciUpper: 18.4,
    pValue: 0.0001,
  },
  {
    cohort: 'High Baseline Expression (Q4)',
    domain: 'Biomarker Stratum',
    n: 365,
    controlMean: 38.4,
    treatmentMean: 62.9,
    effectDelta: 24.5,
    ciLower: 19.6,
    ciUpper: 29.4,
    pValue: 0.0001,
  },
  {
    cohort: 'Moderate Expression (Q2–Q3)',
    domain: 'Biomarker Stratum',
    n: 690,
    controlMean: 42.0,
    treatmentMean: 57.1,
    effectDelta: 15.1,
    ciLower: 11.4,
    ciUpper: 18.8,
    pValue: 0.0004,
  },
  {
    cohort: 'Low Baseline Expression (Q1)',
    domain: 'Biomarker Stratum',
    n: 365,
    controlMean: 43.1,
    treatmentMean: 47.0,
    effectDelta: 3.9,
    ciLower: -1.2,
    ciUpper: 9.0,
    pValue: 0.134,
  },
  {
    cohort: 'Prior Systemic Therapy (≥2 Lines)',
    domain: 'Clinical History',
    n: 510,
    controlMean: 34.8,
    treatmentMean: 52.3,
    effectDelta: 17.5,
    ciLower: 13.1,
    ciUpper: 21.9,
    pValue: 0.0002,
  },
  {
    cohort: 'Treatment-Naive (First Line)',
    domain: 'Clinical History',
    n: 910,
    controlMean: 44.8,
    treatmentMean: 59.3,
    effectDelta: 14.5,
    ciLower: 11.1,
    ciUpper: 17.9,
    pValue: 0.0001,
  },
  {
    cohort: 'ECOG Performance Status 0',
    domain: 'Functional Status',
    n: 840,
    controlMean: 45.5,
    treatmentMean: 62.0,
    effectDelta: 16.5,
    ciLower: 13.0,
    ciUpper: 20.0,
    pValue: 0.0001,
  },
  {
    cohort: 'ECOG Performance Status 1–2',
    domain: 'Functional Status',
    n: 580,
    controlMean: 35.0,
    treatmentMean: 49.3,
    effectDelta: 14.3,
    ciLower: 9.9,
    ciUpper: 18.7,
    pValue: 0.0012,
  },
];

function validatePairedCohortData(raw: unknown): DataValidationResult<PairedCohortRecord[]> {
  if (!Array.isArray(raw)) {
    return {
      valid: false,
      errors: ['Expected an array of cohort records (JSON array or CSV rows).'],
    };
  }

  if (raw.length === 0) {
    return {
      valid: false,
      errors: ['Dataset contains 0 rows. At least 1 cohort record is required.'],
    };
  }

  const errors: string[] = [];
  const validated: PairedCohortRecord[] = [];

  raw.forEach((item, idx) => {
    if (typeof item !== 'object' || item === null) {
      errors.push(`Row ${idx + 1}: Record must be an object.`);
      return;
    }

    const rec = item as Record<string, unknown>;
    const cohort = String(rec.cohort ?? '').trim();
    const domain = String(rec.domain ?? 'Subgroup').trim();
    const n = Number(rec.n);
    const controlMean = Number(rec.controlMean);
    const treatmentMean = Number(rec.treatmentMean);
    const effectDelta =
      rec.effectDelta !== undefined
        ? Number(rec.effectDelta)
        : Number((treatmentMean - controlMean).toFixed(2));
    const ciLower = Number(rec.ciLower);
    const ciUpper = Number(rec.ciUpper);
    const pValue = rec.pValue !== undefined ? Number(rec.pValue) : 0.05;

    if (!cohort) {
      errors.push(`Row ${idx + 1}: Missing required string field "cohort".`);
    }
    if ([n, controlMean, treatmentMean, effectDelta, ciLower, ciUpper].some(Number.isNaN)) {
      errors.push(
        `Row ${idx + 1} ("${cohort || 'unnamed'}"): Numeric fields (n, controlMean, treatmentMean, ciLower, ciUpper) must be valid numbers.`
      );
    }

    if (errors.length === 0) {
      validated.push({
        cohort,
        domain,
        n,
        controlMean,
        treatmentMean,
        effectDelta,
        ciLower,
        ciUpper,
        pValue: Number.isNaN(pValue) ? 0.05 : pValue,
      });
    }
  });

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: validated,
    recordCount: validated.length,
  };
}

/**
 * Bespoke Multi-Panel SVG Composition:
 * - Left Column: Stratified Cohort Hierarchy & Sample Size (N)
 * - Center Panel A: Paired Control → Intervention Trajectory Dumbbell with directional vector arrows
 * - Center Panel B: 95% Confidence Interval Forest Plot with hatched MCID equivalence zone
 * - Right Column: Exact tabular numeric readout (Δ [95% CI] & p-value)
 */
const PairedTrajectoryForestGraphic: React.FC<
  FrameworkRenderProps<PairedCohortRecord[], PairedTrajectoryConfig>
> = ({ data, config, bounds, theme }) => {
  const { innerWidth, innerHeight } = bounds;

  // Sort data according to bespoke parameter
  const sortedData = React.useMemo(() => {
    const copy = [...data];
    if (config.sortOrder === 'effectDesc') {
      copy.sort((a, b) => b.effectDelta - a.effectDelta);
    } else if (config.sortOrder === 'effectAsc') {
      copy.sort((a, b) => a.effectDelta - b.effectDelta);
    } else if (config.sortOrder === 'sampleSize') {
      copy.sort((a, b) => b.n - a.n);
    }
    return copy;
  }, [data, config.sortOrder]);

  // Multi-panel horizontal layout geometry (proportional to innerWidth)
  const labelColWidth = Math.min(250, Math.round(innerWidth * 0.28));
  const statsColWidth = Math.min(185, Math.round(innerWidth * 0.21));
  const panelGap = 28;
  const remainingPlotWidth = Math.max(
    200,
    innerWidth - labelColWidth - statsColWidth - panelGap * 2
  );

  // Panel A (Absolute Trajectory) gets 52% of plot width; Panel B (Forest Effect) gets 48%
  const panelAWidth = Math.round(remainingPlotWidth * 0.52);
  const panelBWidth = remainingPlotWidth - panelAWidth;

  const panelAX = labelColWidth;
  const panelBX = labelColWidth + panelAWidth + panelGap;
  const statsColX = panelBX + panelBWidth + panelGap;

  const topHeaderOffset = 38;
  const bottomAxisOffset = 34;
  const plotBodyHeight = Math.max(120, innerHeight - topHeaderOffset - bottomAxisOffset);

  // Vertical Band Scale for cohorts
  const yScale = d3
    .scaleBand<string>()
    .domain(sortedData.map((d) => d.cohort))
    .range([topHeaderOffset, topHeaderOffset + plotBodyHeight])
    .paddingInner(0.28)
    .paddingOuter(0.15);

  // Panel A X-Scale (Absolute Control & Treatment Means)
  const allMeans = sortedData.flatMap((d) => [d.controlMean, d.treatmentMean]);
  const minMean = d3.min(allMeans) ?? 0;
  const maxMean = d3.max(allMeans) ?? 100;
  const meanPadding = (maxMean - minMean) * 0.15 || 5;

  const xScalePanelA = d3
    .scaleLinear()
    .domain([Math.floor(minMean - meanPadding), Math.ceil(maxMean + meanPadding)])
    .range([0, panelAWidth])
    .nice();

  // Panel B X-Scale (Effect Delta & 95% CI around 0)
  const allCis = sortedData.flatMap((d) => [d.ciLower, d.ciUpper, 0, -config.mcidThreshold, config.mcidThreshold]);
  const minCi = d3.min(allCis) ?? -10;
  const maxCi = d3.max(allCis) ?? 30;
  const ciPadding = (maxCi - minCi) * 0.12 || 2;

  const xScalePanelB = d3
    .scaleLinear()
    .domain([Math.floor(minCi - ciPadding), Math.ceil(maxCi + ciPadding)])
    .range([0, panelBWidth])
    .nice();

  // Sample size radius scale
  const nExtent = d3.extent(sortedData, (d) => d.n) as [number, number];
  const rScale = d3
    .scaleSqrt()
    .domain([Math.max(1, nExtent[0] ?? 10), Math.max(10, nExtent[1] ?? 1000)])
    .range([4, 7.5]);

  const panelATicks = xScalePanelA.ticks(5);
  const panelBTicks = xScalePanelB.ticks(5);
  const zeroX = xScalePanelB(0);
  const mcidLeftX = xScalePanelB(-Math.abs(config.mcidThreshold));
  const mcidRightX = xScalePanelB(Math.abs(config.mcidThreshold));

  const controlColor = theme.palette.significance.baseline;
  const treatmentColor = theme.palette.categorical[0];
  const nonSigColor = theme.palette.significance.muted;

  return (
    <g className="paired-trajectory-forest-framework">
      {/* Column & Panel Sub-headers */}
      <g className="panel-headers" transform="translate(0, 12)">
        <text
          x={0}
          y={0}
          fill={theme.inkSecondary}
          fontFamily={theme.fontFamilyMono}
          fontSize={10}
          fontWeight={700}
          letterSpacing="0.06em"
        >
          STRATIFIED COHORT (N)
        </text>

        <text
          x={panelAX}
          y={0}
          fill={theme.inkSecondary}
          fontFamily={theme.fontFamilyMono}
          fontSize={10}
          fontWeight={700}
          letterSpacing="0.06em"
        >
          A. PAIRED TRAJECTORY ({config.metricUnit.toUpperCase()})
        </text>

        {/* Inline Legend in Panel A Header */}
        <g transform={`translate(${panelAX + panelAWidth}, -4)`} textAnchor="end">
          <circle cx={-118} cy={0} r={4} fill={ theme.background } stroke={controlColor} strokeWidth={2} />
          <text x={-110} y={3.5} fill={theme.inkMuted} fontSize={10} textAnchor="start">
            Control
          </text>
          <circle cx={-56} cy={0} r={4.5} fill={treatmentColor} />
          <text x={-48} y={3.5} fill={theme.inkPrimary} fontSize={10} fontWeight={600} textAnchor="start">
            Intervention
          </text>
        </g>

        <text
          x={panelBX}
          y={0}
          fill={theme.inkSecondary}
          fontFamily={theme.fontFamilyMono}
          fontSize={10}
          fontWeight={700}
          letterSpacing="0.06em"
        >
          B. TREATMENT EFFECT Δ (95% CI)
        </text>

        <text
          x={statsColX + statsColWidth}
          y={0}
          textAnchor="end"
          fill={theme.inkSecondary}
          fontFamily={theme.fontFamilyMono}
          fontSize={10}
          fontWeight={700}
          letterSpacing="0.06em"
        >
          ESTIMATE [95% CI] / P
        </text>

        <line
          x1={0}
          y1={10}
          x2={innerWidth}
          y2={10}
          stroke={theme.inkPrimary}
          strokeWidth={1.2}
        />
      </g>

      {/* Panel A Vertical Gridlines & Bottom Axis */}
      <g className="panel-a-grid" transform={`translate(${panelAX}, 0)`}>
        {panelATicks.map((tick) => {
          const tx = xScalePanelA(tick);
          return (
            <g key={`pa-tick-${tick}`} transform={`translate(${tx}, 0)`}>
              <line
                x1={0}
                y1={topHeaderOffset - 8}
                x2={0}
                y2={topHeaderOffset + plotBodyHeight}
                stroke={theme.gridline}
                strokeWidth={1}
                strokeDasharray="2 2"
              />
              <text
                x={0}
                y={topHeaderOffset + plotBodyHeight + 16}
                textAnchor="middle"
                fill={theme.inkMuted}
                fontFamily={theme.fontFamilyMono}
                fontSize={10}
              >
                {tick}
              </text>
            </g>
          );
        })}
        <line
          x1={0}
          y1={topHeaderOffset + plotBodyHeight}
          x2={panelAWidth}
          y2={topHeaderOffset + plotBodyHeight}
          stroke={theme.axisLine}
          strokeWidth={1}
        />
        <text
          x={panelAWidth / 2}
          y={topHeaderOffset + plotBodyHeight + 31}
          textAnchor="middle"
          fill={theme.inkSecondary}
          fontSize={10.5}
          fontWeight={500}
        >
          Mean Score ({config.metricUnit})
        </text>
      </g>

      {/* Panel B Vertical Gridlines, MCID Equivalence Band, and Zero Line */}
      <g className="panel-b-grid" transform={`translate(${panelBX}, 0)`}>
        {/* Hatched MCID Equivalence Band */}
        {config.mcidThreshold > 0 && (
          <g>
            <rect
              x={Math.max(0, mcidLeftX)}
              y={topHeaderOffset - 8}
              width={Math.max(0, Math.min(panelBWidth, mcidRightX) - Math.max(0, mcidLeftX))}
              height={plotBodyHeight + 8}
              fill="url(#pattern-hatch-diagonal)"
            />
            <rect
              x={Math.max(0, mcidLeftX)}
              y={topHeaderOffset - 8}
              width={Math.max(0, Math.min(panelBWidth, mcidRightX) - Math.max(0, mcidLeftX))}
              height={plotBodyHeight + 8}
              fill={theme.palette.significance.confidenceBand}
              fillOpacity={0.35}
            />
          </g>
        )}

        {panelBTicks.map((tick) => {
          const tx = xScalePanelB(tick);
          return (
            <g key={`pb-tick-${tick}`} transform={`translate(${tx}, 0)`}>
              <line
                x1={0}
                y1={topHeaderOffset - 8}
                x2={0}
                y2={topHeaderOffset + plotBodyHeight}
                stroke={theme.gridline}
                strokeWidth={1}
                strokeDasharray="2 2"
              />
              <text
                x={0}
                y={topHeaderOffset + plotBodyHeight + 16}
                textAnchor="middle"
                fill={theme.inkMuted}
                fontFamily={theme.fontFamilyMono}
                fontSize={10}
              >
                {tick > 0 ? `+${tick}` : tick}
              </text>
            </g>
          );
        })}

        {/* Zero Reference Line */}
        {zeroX >= 0 && zeroX <= panelBWidth && (
          <line
            x1={zeroX}
            y1={topHeaderOffset - 10}
            x2={zeroX}
            y2={topHeaderOffset + plotBodyHeight}
            stroke={theme.inkPrimary}
            strokeWidth={1.25}
          />
        )}

        <line
          x1={0}
          y1={topHeaderOffset + plotBodyHeight}
          x2={panelBWidth}
          y2={topHeaderOffset + plotBodyHeight}
          stroke={theme.axisLine}
          strokeWidth={1}
        />
        <text
          x={panelBWidth / 2}
          y={topHeaderOffset + plotBodyHeight + 31}
          textAnchor="middle"
          fill={theme.inkSecondary}
          fontSize={10.5}
          fontWeight={500}
        >
          Treatment Difference Δ ({config.metricUnit})
        </text>
      </g>

      {/* Cohort Rows */}
      {sortedData.map((row, index) => {
        const bandY = yScale(row.cohort) ?? 0;
        const rowCenterY = bandY + yScale.bandwidth() / 2;
        const isPrimaryRow = index === 0 && row.domain.toLowerCase().includes('primary');
        const isSignificant = row.ciLower > 0 || row.ciUpper < 0;
        const exceedsMcid = Math.abs(row.effectDelta) >= config.mcidThreshold && isSignificant;

        const xControl = xScalePanelA(row.controlMean);
        const xTreatment = xScalePanelA(row.treatmentMean);
        const pointRadius = config.scalePointsBySampleSize ? rScale(row.n) : 5;

        const xDelta = xScalePanelB(row.effectDelta);
        const xCiLow = xScalePanelB(row.ciLower);
        const xCiHigh = xScalePanelB(row.ciUpper);

        const activeAccent = exceedsMcid ? treatmentColor : isSignificant ? theme.inkPrimary : nonSigColor;

        return (
          <g key={row.cohort} className="cohort-row">
            {/* Subtle Alternating Row Zebra / Primary Row Highlight */}
            {isPrimaryRow ? (
              <rect
                x={0}
                y={bandY - 3}
                width={innerWidth}
                height={yScale.bandwidth() + 6}
                fill={theme.palette.significance.confidenceBand}
                rx={2}
              />
            ) : (
              index % 2 === 1 && (
                <rect
                  x={0}
                  y={bandY - 2}
                  width={innerWidth}
                  height={yScale.bandwidth() + 4}
                  fill={theme.gridline}
                  fillOpacity={0.22}
                />
              )
            )}

            {/* 1. Left Column: Domain Tag, Cohort Name, and Sample Size */}
            <g transform={`translate(0, ${rowCenterY})`}>
              <text
                x={0}
                y={-5}
                fill={theme.inkMuted}
                fontFamily={theme.fontFamilyMono}
                fontSize={8.5}
                letterSpacing="0.04em"
              >
                {row.domain.toUpperCase()} · N={row.n}
              </text>
              <text
                x={0}
                y={8}
                fill={theme.inkPrimary}
                fontSize={12}
                fontWeight={isPrimaryRow ? 700 : 500}
              >
                {row.cohort}
              </text>
            </g>

            {/* 2. Panel A: Paired Control → Intervention Dumbbell */}
            <g transform={`translate(${panelAX}, ${rowCenterY})`}>
              {/* Connecting Trajectory Line */}
              <line
                x1={xControl}
                y1={0}
                x2={xTreatment}
                y2={0}
                stroke={activeAccent}
                strokeWidth={isPrimaryRow ? 2.5 : 1.8}
                strokeOpacity={0.85}
              />

              {/* Control Mean Open Circle */}
              <circle
                cx={xControl}
                cy={0}
                r={pointRadius * 0.85}
                fill={theme.background}
                stroke={controlColor}
                strokeWidth={2}
              />

              {/* Treatment Mean Filled Circle */}
              <circle
                cx={xTreatment}
                cy={0}
                r={pointRadius}
                fill={activeAccent}
                stroke={theme.background}
                strokeWidth={1.2}
              />

              {/* Direct Value Callouts */}
              {config.showDirectValueLabels && (
                <>
                  <text
                    x={xControl - pointRadius - 4}
                    y={3.5}
                    textAnchor="end"
                    fill={theme.inkMuted}
                    fontFamily={theme.fontFamilyMono}
                    fontSize={9.5}
                    filter="url(#filter-text-halo)"
                  >
                    {row.controlMean.toFixed(1)}
                  </text>
                  <text
                    x={xTreatment + pointRadius + 4}
                    y={3.5}
                    textAnchor="start"
                    fill={theme.inkPrimary}
                    fontFamily={theme.fontFamilyMono}
                    fontSize={9.5}
                    fontWeight={600}
                    filter="url(#filter-text-halo)"
                  >
                    {row.treatmentMean.toFixed(1)}
                  </text>
                </>
              )}
            </g>

            {/* 3. Panel B: 95% CI Forest Whisker & Estimate Marker */}
            <g transform={`translate(${panelBX}, ${rowCenterY})`}>
              {/* 95% Confidence Interval Whisker */}
              <line
                x1={xCiLow}
                y1={0}
                x2={xCiHigh}
                y2={0}
                stroke={activeAccent}
                strokeWidth={isPrimaryRow ? 2.2 : 1.6}
              />
              {/* Whisker End Caps */}
              <line
                x1={xCiLow}
                y1={-3.5}
                x2={xCiLow}
                y2={3.5}
                stroke={activeAccent}
                strokeWidth={1.4}
              />
              <line
                x1={xCiHigh}
                y1={-3.5}
                x2={xCiHigh}
                y2={3.5}
                stroke={activeAccent}
                strokeWidth={1.4}
              />

              {/* Point Estimate Symbol (Diamond for Primary Row, Precision Square for Subgroups) */}
              {isPrimaryRow ? (
                <polygon
                  points={`${xDelta},-6.5 ${xDelta + 6.5},0 ${xDelta},6.5 ${xDelta - 6.5},0`}
                  fill={activeAccent}
                  stroke={theme.background}
                  strokeWidth={1}
                />
              ) : (
                <rect
                  x={xDelta - 4.2}
                  y={-4.2}
                  width={8.4}
                  height={8.4}
                  rx={1.2}
                  fill={activeAccent}
                  stroke={theme.background}
                  strokeWidth={1}
                />
              )}
            </g>

            {/* 4. Right Column: Exact Tabular Statistical Readout */}
            <g transform={`translate(${statsColX + statsColWidth}, ${rowCenterY})`}>
              <text
                x={0}
                y={-2}
                textAnchor="end"
                fill={isSignificant ? theme.inkPrimary : theme.inkMuted}
                fontFamily={theme.fontFamilyMono}
                fontSize={10.5}
                fontWeight={isPrimaryRow ? 700 : 600}
              >
                {row.effectDelta > 0 ? `+${row.effectDelta.toFixed(1)}` : row.effectDelta.toFixed(1)}{' '}
                [{row.ciLower.toFixed(1)}, {row.ciUpper.toFixed(1)}]
              </text>
              <text
                x={0}
                y={10}
                textAnchor="end"
                fill={row.pValue < 0.01 ? theme.accentPrimary : theme.inkMuted}
                fontFamily={theme.fontFamilyMono}
                fontSize={9}
              >
                {row.pValue < 0.001 ? 'p < 0.001' : `p = ${row.pValue.toFixed(3)}`}
              </text>
            </g>
          </g>
        );
      })}
    </g>
  );
};

export const pairedTrajectoryForestFramework: VisualFramework<
  PairedCohortRecord[],
  PairedTrajectoryConfig
> = {
  id: 'paired-trajectory-forest',
  name: 'Paired Cohort Trajectory & Effect Forest',
  category: 'Clinical & Comparative Trials',
  description:
    'Synchronized two-panel analytical plate pairing baseline-to-intervention trajectory dumbbells with a 95% confidence interval forest plot, hatched MCID equivalence zone, and tabular statistical readout.',
  defaultDimensions: {
    width: 960,
    height: 600,
    margin: { top: 88, right: 36, bottom: 56, left: 36 },
  },
  defaultMetadata: {
    figureLabel: 'FIGURE 1 // SUBGROUP TREATMENT EFFICACY',
    title: 'Intervention Efficacy Across Stratified Biomarker & Clinical Cohorts',
    subtitle:
      'Comparison of baseline control vs. post-intervention functional scores (Panel A) and net treatment effect Δ with 95% confidence intervals (Panel B).',
    footnote:
      'Hatched region in Panel B denotes the Minimum Clinically Important Difference (MCID = ±5.0 pts). Error bars indicate two-sided 95% CIs.',
    source: 'Multicenter Phase III Randomized Controlled Trial (N = 1,420)',
    credit: 'GBG Research Framework v1',
  },
  defaultConfig: {
    metricUnit: 'pts',
    mcidThreshold: 5.0,
    sortOrder: 'original',
    scalePointsBySampleSize: true,
    showDirectValueLabels: true,
  },
  parameters: [
    {
      key: 'metricUnit',
      label: 'Measurement Unit Label',
      type: 'text',
    },
    {
      key: 'mcidThreshold',
      label: 'MCID Equivalence Threshold (±)',
      description: 'Width of the hatched clinical equivalence zone around zero in Panel B',
      type: 'number',
      min: 0,
      max: 15,
      step: 0.5,
    },
    {
      key: 'sortOrder',
      label: 'Cohort Ordering',
      type: 'select',
      options: [
        { label: 'Prespecified Protocol Order', value: 'original' },
        { label: 'Effect Magnitude (Highest Δ First)', value: 'effectDesc' },
        { label: 'Effect Magnitude (Lowest Δ First)', value: 'effectAsc' },
        { label: 'Subgroup Sample Size (N)', value: 'sampleSize' },
      ],
    },
    {
      key: 'scalePointsBySampleSize',
      label: 'Scale Nodes by Sample Size (√N)',
      type: 'boolean',
    },
    {
      key: 'showDirectValueLabels',
      label: 'Show Direct Endpoint Values',
      type: 'boolean',
    },
  ],
  sampleData: SAMPLE_COHORT_DATA,
  dataSchemaDescription:
    'Array of records with fields: cohort (string), domain (string), n (number), controlMean (number), treatmentMean (number), effectDelta (number), ciLower (number), ciUpper (number), pValue (number).',
  validateData: validatePairedCohortData,
  Component: PairedTrajectoryForestGraphic,
};
