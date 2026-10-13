import React from 'react';
import * as d3 from 'd3';
import type {
  DataValidationResult,
  FrameworkRenderProps,
  VisualFramework,
} from '../core/types';

/**
 * Data record contract for the Raincloud Distribution & Quantile Horizon Framework.
 */
export interface DistributionObservation {
  /** Experimental condition, architecture, or group name */
  group: string;
  /** Optional paradigm or category label */
  paradigm: string;
  /** Continuous measured value */
  value: number;
}

export interface RaincloudHorizonConfig {
  /** Axis measurement unit label */
  axisLabel: string;
  /** Kernel Density Estimation (KDE) smoothing bandwidth */
  kdeBandwidth: number;
  /** Reference benchmark threshold line */
  referenceThreshold: number;
  /** Toggle individual deterministic beeswarm observations */
  showIndividualPoints: boolean;
  /** Toggle median & IQR numeric callout badges */
  showQuantileCallouts: boolean;
}

/**
 * Generate a deterministic, realistic multi-group empirical dataset (N=220 observations across 4 regimes)
 * using a seeded Box-Muller normal generator so the default sample is reproducible and rich.
 */
function generateSampleDistributionData(): DistributionObservation[] {
  let seed = 421337;
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const nextGaussian = (mean: number, stdDev: number) => {
    const u1 = Math.max(1e-7, nextRand());
    const u2 = nextRand();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
  };

  const regimes = [
    {
      group: 'Sparse Mixture-of-Experts (MoE-16B)',
      paradigm: 'Adaptive Routing',
      n: 58,
      mean: 18.4,
      std: 3.1,
      skew: 1.8,
    },
    {
      group: 'Hybrid State-Space (Mamba-Attention)',
      paradigm: 'Linear Recurrence',
      n: 56,
      mean: 22.8,
      std: 3.8,
      skew: 1.2,
    },
    {
      group: 'Speculative Draft Verification',
      paradigm: 'Two-Stage Decoding',
      n: 54,
      mean: 27.5,
      std: 5.2,
      skew: 3.4,
    },
    {
      group: 'Dense Autoregressive Baseline',
      paradigm: 'Standard Transformer',
      n: 52,
      mean: 36.2,
      std: 6.4,
      skew: 2.5,
    },
  ];

  const records: DistributionObservation[] = [];
  for (const r of regimes) {
    for (let i = 0; i < r.n; i++) {
      const base = nextGaussian(r.mean, r.std);
      const tail = nextRand() > 0.82 ? nextRand() * r.skew * 2.4 : 0;
      records.push({
        group: r.group,
        paradigm: r.paradigm,
        value: Number(Math.max(4, base + tail).toFixed(2)),
      });
    }
  }
  return records;
}

const SAMPLE_RAINCLOUD_DATA = generateSampleDistributionData();

function validateRaincloudData(raw: unknown): DataValidationResult<DistributionObservation[]> {
  if (!Array.isArray(raw)) {
    return {
      valid: false,
      errors: ['Expected an array of observation records (each with "group" and numeric "value").'],
    };
  }

  if (raw.length < 3) {
    return {
      valid: false,
      errors: ['Provide at least 3 observation records to compute distribution quantiles.'],
    };
  }

  const errors: string[] = [];
  const validated: DistributionObservation[] = [];

  raw.forEach((item, idx) => {
    if (typeof item !== 'object' || item === null) {
      errors.push(`Row ${idx + 1}: Record must be an object.`);
      return;
    }
    const rec = item as Record<string, unknown>;
    const group = String(rec.group ?? '').trim();
    const paradigm = String(rec.paradigm ?? 'Empirical').trim();
    const value = Number(rec.value);

    if (!group) {
      errors.push(`Row ${idx + 1}: Missing "group" string field.`);
    }
    if (Number.isNaN(value)) {
      errors.push(`Row ${idx + 1}: Field "value" must be a valid number.`);
    }

    if (errors.length === 0) {
      validated.push({ group, paradigm, value });
    }
  });

  if (errors.length > 0) {
    return { valid: false, errors: errors.slice(0, 6) };
  }

  return {
    valid: true,
    data: validated,
    recordCount: validated.length,
  };
}

/**
 * Epanechnikov Kernel Density Estimator for smooth half-violin ridgelines.
 */
function computeKde(
  values: number[],
  gridTicks: number[],
  bandwidth: number
): [number, number][] {
  const bw = Math.max(0.5, bandwidth);
  return gridTicks.map((x) => {
    const density =
      d3.mean(values, (v) => {
        const u = (x - v) / bw;
        return Math.abs(u) <= 1 ? (0.75 * (1 - u * u)) / bw : 0;
      }) ?? 0;
    return [x, density];
  });
}

const RaincloudHorizonGraphic: React.FC<
  FrameworkRenderProps<DistributionObservation[], RaincloudHorizonConfig>
> = ({ data, config, bounds, theme }) => {
  const { innerWidth, innerHeight } = bounds;

  // Group observations by `group`
  const groupedStats = React.useMemo(() => {
    const map = d3.group(data, (d) => d.group);
    return Array.from(map.entries()).map(([groupName, obs]) => {
      const sortedVals = obs.map((o) => o.value).sort(d3.ascending);
      const q05 = d3.quantileSorted(sortedVals, 0.05) ?? sortedVals[0];
      const q25 = d3.quantileSorted(sortedVals, 0.25) ?? sortedVals[0];
      const median = d3.quantileSorted(sortedVals, 0.5) ?? sortedVals[0];
      const q75 = d3.quantileSorted(sortedVals, 0.75) ?? sortedVals[0];
      const q95 = d3.quantileSorted(sortedVals, 0.95) ?? sortedVals[0];
      const mean = d3.mean(sortedVals) ?? median;

      return {
        group: groupName,
        paradigm: obs[0]?.paradigm ?? 'Empirical',
        n: sortedVals.length,
        values: sortedVals,
        q05,
        q25,
        median,
        q75,
        q95,
        mean,
      };
    });
  }, [data]);

  const labelColWidth = Math.min(245, Math.round(innerWidth * 0.28));
  const summaryColWidth = Math.min(155, Math.round(innerWidth * 0.18));
  const plotX = labelColWidth + 16;
  const plotWidth = Math.max(220, innerWidth - plotX - summaryColWidth - 20);
  const summaryColX = plotX + plotWidth + 20;

  const topHeaderHeight = 32;
  const bottomAxisHeight = 36;
  const bodyHeight = Math.max(140, innerHeight - topHeaderHeight - bottomAxisHeight);

  const allValues = data.map((d) => d.value);
  const minVal = Math.min(d3.min(allValues) ?? 0, config.referenceThreshold);
  const maxVal = Math.max(d3.max(allValues) ?? 50, config.referenceThreshold);
  const domainPad = (maxVal - minVal) * 0.1 || 2;

  const xScale = d3
    .scaleLinear()
    .domain([Math.max(0, Math.floor(minVal - domainPad)), Math.ceil(maxVal + domainPad)])
    .range([0, plotWidth])
    .nice();

  const yScale = d3
    .scaleBand<string>()
    .domain(groupedStats.map((g) => g.group))
    .range([topHeaderHeight, topHeaderHeight + bodyHeight])
    .paddingInner(0.25)
    .paddingOuter(0.12);

  const kdeGrid = xScale.ticks(60);

  // Compute KDE curves and find global max density for consistent vertical scaling
  const kdeByGroup = React.useMemo(() => {
    return groupedStats.map((g) => computeKde(g.values, kdeGrid, config.kdeBandwidth));
  }, [groupedStats, kdeGrid, config.kdeBandwidth]);

  const maxDensity =
    d3.max(kdeByGroup, (curve) => d3.max(curve, (pt) => pt[1])) || 0.05;

  const xTicks = xScale.ticks(7);
  const refX = xScale(config.referenceThreshold);

  return (
    <g className="raincloud-horizon-framework">
      {/* Header Bar */}
      <g transform="translate(0, 12)">
        <text
          x={0}
          y={0}
          fill={theme.inkSecondary}
          fontFamily={theme.fontFamilyMono}
          fontSize={10}
          fontWeight={700}
          letterSpacing="0.06em"
        >
          EXPERIMENTAL REGIME (N)
        </text>
        <text
          x={plotX}
          y={0}
          fill={theme.inkSecondary}
          fontFamily={theme.fontFamilyMono}
          fontSize={10}
          fontWeight={700}
          letterSpacing="0.06em"
        >
          DENSITY HORIZON, IQR BOX & EMPIRICAL OBSERVATIONS
        </text>
        <text
          x={summaryColX + summaryColWidth}
          y={0}
          textAnchor="end"
          fill={theme.inkSecondary}
          fontFamily={theme.fontFamilyMono}
          fontSize={10}
          fontWeight={700}
          letterSpacing="0.06em"
        >
          MEDIAN (IQR)
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

      {/* Plot Gridlines & Reference Threshold */}
      <g transform={`translate(${plotX}, 0)`}>
        {xTicks.map((tick) => {
          const tx = xScale(tick);
          return (
            <g key={`rc-tick-${tick}`} transform={`translate(${tx}, 0)`}>
              <line
                x1={0}
                y1={topHeaderHeight - 6}
                x2={0}
                y2={topHeaderHeight + bodyHeight}
                stroke={theme.gridline}
                strokeWidth={1}
                strokeDasharray="2 2"
              />
              <text
                x={0}
                y={topHeaderHeight + bodyHeight + 16}
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

        {/* SLA / Benchmark Reference Threshold Line */}
        {refX >= 0 && refX <= plotWidth && (
          <g transform={`translate(${refX}, 0)`}>
            <line
              x1={0}
              y1={topHeaderHeight - 6}
              x2={0}
              y2={topHeaderHeight + bodyHeight}
              stroke={theme.accentSecondary}
              strokeWidth={1.5}
              strokeDasharray="5 3"
            />
            <text
              x={5}
              y={topHeaderHeight + 6}
              fill={theme.accentSecondary}
              fontFamily={theme.fontFamilyMono}
              fontSize={9}
              fontWeight={700}
              filter="url(#filter-text-halo)"
            >
              TARGET = {config.referenceThreshold}
            </text>
          </g>
        )}

        <line
          x1={0}
          y1={topHeaderHeight + bodyHeight}
          x2={plotWidth}
          y2={topHeaderHeight + bodyHeight}
          stroke={theme.axisLine}
          strokeWidth={1}
        />
        <text
          x={plotWidth / 2}
          y={topHeaderHeight + bodyHeight + 32}
          textAnchor="middle"
          fill={theme.inkSecondary}
          fontSize={11}
          fontWeight={500}
        >
          {config.axisLabel}
        </text>
      </g>

      {/* Group Raincloud Rows */}
      {groupedStats.map((g, idx) => {
        const rowTop = yScale(g.group) ?? 0;
        const rowHeight = yScale.bandwidth();
        const baselineY = rowTop + rowHeight * 0.58;
        const maxCloudHeight = rowHeight * 0.55;
        const color =
          theme.palette.categorical[idx % theme.palette.categorical.length];

        const kdeCurve = kdeByGroup[idx];
        const areaGenerator = d3
          .area<[number, number]>()
          .x((d) => xScale(d[0]))
          .y0(baselineY)
          .y1((d) => baselineY - (d[1] / maxDensity) * maxCloudHeight)
          .curve(d3.curveCatmullRom);

        const lineGenerator = d3
          .line<[number, number]>()
          .x((d) => xScale(d[0]))
          .y((d) => baselineY - (d[1] / maxDensity) * maxCloudHeight)
          .curve(d3.curveCatmullRom);

        const areaPath = areaGenerator(kdeCurve) ?? '';
        const linePath = lineGenerator(kdeCurve) ?? '';

        return (
          <g key={g.group} className="raincloud-row">
            {/* Subtle Baseline Separator */}
            <line
              x1={0}
              y1={rowTop + rowHeight + 4}
              x2={innerWidth}
              y2={rowTop + rowHeight + 4}
              stroke={theme.gridline}
              strokeWidth={0.6}
            />

            {/* Left Label Block */}
            <g transform={`translate(0, ${baselineY - 6})`}>
              <text
                x={0}
                y={-9}
                fill={theme.inkMuted}
                fontFamily={theme.fontFamilyMono}
                fontSize={8.5}
                letterSpacing="0.04em"
              >
                {g.paradigm.toUpperCase()} · N={g.n}
              </text>
              <text
                x={0}
                y={5}
                fill={theme.inkPrimary}
                fontSize={12}
                fontWeight={600}
              >
                {g.group}
              </text>
            </g>

            {/* Center Raincloud Geometry */}
            <g transform={`translate(${plotX}, 0)`}>
              {/* 1. Upper Half-Violin KDE Density Cloud */}
              <path
                d={areaPath}
                fill={color}
                fillOpacity={0.24}
              />
              <path
                d={linePath}
                fill="none"
                stroke={color}
                strokeWidth={1.8}
              />

              {/* 2. 5th–95th Percentile Whisker & IQR Quantile Box on Baseline */}
              <line
                x1={xScale(g.q05)}
                y1={baselineY}
                x2={xScale(g.q95)}
                y2={baselineY}
                stroke={theme.inkPrimary}
                strokeWidth={1.25}
              />

              <rect
                x={xScale(g.q25)}
                y={baselineY - 4.5}
                width={Math.max(2, xScale(g.q75) - xScale(g.q25))}
                height={9}
                rx={1.5}
                fill={theme.background}
                stroke={theme.inkPrimary}
                strokeWidth={1.5}
              />

              {/* Median Vertical Bar inside IQR Box */}
              <line
                x1={xScale(g.median)}
                y1={baselineY - 5}
                x2={xScale(g.median)}
                y2={baselineY + 5}
                stroke={color}
                strokeWidth={2.6}
              />

              {/* Direct Median Badge above Cloud Peak */}
              {config.showQuantileCallouts && (
                <text
                  x={xScale(g.median)}
                  y={baselineY - 9}
                  textAnchor="middle"
                  fill={theme.inkPrimary}
                  fontFamily={theme.fontFamilyMono}
                  fontSize={9.5}
                  fontWeight={700}
                  filter="url(#filter-text-halo)"
                >
                  {g.median.toFixed(1)}
                </text>
              )}

              {/* 3. Lower Deterministic Jittered Raindrop Strip */}
              {config.showIndividualPoints &&
                g.values.map((val, vIdx) => {
                  // Deterministic pseudo-random vertical offset based on index
                  const jitterNorm = ((vIdx * 73 + idx * 31) % 100) / 100;
                  const dropY = baselineY + 10 + jitterNorm * (rowHeight * 0.28);
                  return (
                    <circle
                      key={`${g.group}-pt-${vIdx}`}
                      cx={xScale(val)}
                      cy={dropY}
                      r={2.3}
                      fill={color}
                      fillOpacity={0.62}
                      stroke={theme.background}
                      strokeWidth={0.4}
                    />
                  );
                })}
            </g>

            {/* Right Tabular Readout: Median & IQR */}
            <g transform={`translate(${summaryColX + summaryColWidth}, ${baselineY})`}>
              <text
                x={0}
                y={-2}
                textAnchor="end"
                fill={theme.inkPrimary}
                fontFamily={theme.fontFamilyMono}
                fontSize={11}
                fontWeight={600}
              >
                {g.median.toFixed(1)} ({g.q25.toFixed(1)}–{g.q75.toFixed(1)})
              </text>
              <text
                x={0}
                y={11}
                textAnchor="end"
                fill={theme.inkMuted}
                fontFamily={theme.fontFamilyMono}
                fontSize={9}
              >
                90% range: {g.q05.toFixed(1)}–{g.q95.toFixed(1)}
              </text>
            </g>
          </g>
        );
      })}
    </g>
  );
};

export const raincloudHorizonFramework: VisualFramework<
  DistributionObservation[],
  RaincloudHorizonConfig
> = {
  id: 'raincloud-quantile-horizon',
  name: 'Raincloud Distribution & Quantile Horizon',
  category: 'Empirical Distributions & Benchmarks',
  description:
    'Combines non-parametric Epanechnikov kernel density ridgelines, 25th–75th interquartile boxplots, 5th–95th tail whiskers, and individual empirical observations.',
  defaultDimensions: {
    width: 960,
    height: 580,
    margin: { top: 88, right: 36, bottom: 56, left: 36 },
  },
  defaultMetadata: {
    figureLabel: 'FIGURE 2 // EMPIRICAL LATENCY DISTRIBUTIONS',
    title: 'Token Generation Latency Across Neural Decoding Architectures',
    subtitle:
      'Kernel density profiles, interquartile ranges (boxes), 5th–95th percentile tails, and individual benchmark trials (N = 220 runs).',
    footnote:
      'Vertical dashed line marks the 25.0 ms real-time interactive SLA target. Boxes depict median and 25th–75th IQR.',
    source: 'Systems Evaluation Lab — H100 Tensor Core Benchmark Suite',
    credit: 'GBG Research Framework v1',
  },
  defaultConfig: {
    axisLabel: 'Time-to-Next-Token Latency (ms / token)',
    kdeBandwidth: 2.2,
    referenceThreshold: 25.0,
    showIndividualPoints: true,
    showQuantileCallouts: true,
  },
  parameters: [
    {
      key: 'axisLabel',
      label: 'Horizontal Axis Label',
      type: 'text',
    },
    {
      key: 'kdeBandwidth',
      label: 'Kernel Smoothing Bandwidth',
      type: 'number',
      min: 0.8,
      max: 6.0,
      step: 0.2,
    },
    {
      key: 'referenceThreshold',
      label: 'Target Benchmark Threshold',
      type: 'number',
      min: 5,
      max: 50,
      step: 0.5,
    },
    {
      key: 'showIndividualPoints',
      label: 'Render Individual Observation Drops',
      type: 'boolean',
    },
    {
      key: 'showQuantileCallouts',
      label: 'Show Direct Median Callout Badges',
      type: 'boolean',
    },
  ],
  sampleData: SAMPLE_RAINCLOUD_DATA,
  dataSchemaDescription:
    'Array of empirical observations with fields: group (string), paradigm (string, optional), value (number).',
  validateData: validateRaincloudData,
  Component: RaincloudHorizonGraphic,
};
