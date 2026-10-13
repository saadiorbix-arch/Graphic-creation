import React from 'react';
import * as d3 from 'd3';
import type { DataValidationResult, FrameworkRenderProps, VisualFramework } from '../core/types';

export interface ModelParetoEntry {
  modelName: string;
  architectureFamily: string;
  latencyMs: number;
  accuracyScore: number;
  parameterCountBillion: number;
  isFrontier: boolean;
}

export interface ParetoConfig {
  showFrontierEnvelope: boolean;
  scaleByParameterSize: boolean;
  minAcceptableScore: number;
  maxAcceptableLatency: number;
}

const SAMPLE_PARETO_DATA: ModelParetoEntry[] = [
  // Frontier champions (optimal accuracy for given latency)
  { modelName: 'Mamba-SSM-7B', architectureFamily: 'State-Space Model', latencyMs: 14.2, accuracyScore: 74.8, parameterCountBillion: 7.0, isFrontier: true },
  { modelName: 'MoE-Sparse-8x7B', architectureFamily: 'Mixture of Experts', latencyMs: 22.5, accuracyScore: 81.2, parameterCountBillion: 46.7, isFrontier: true },
  { modelName: 'Hybrid-Recurrent-14B', architectureFamily: 'State-Space Model', latencyMs: 31.0, accuracyScore: 84.6, parameterCountBillion: 14.2, isFrontier: true },
  { modelName: 'Dense-Transformer-70B', architectureFamily: 'Standard Dense', latencyMs: 58.4, accuracyScore: 88.9, parameterCountBillion: 70.0, isFrontier: true },
  { modelName: 'Deep-Ensemble-MoE-405B', architectureFamily: 'Mixture of Experts', latencyMs: 112.0, accuracyScore: 92.4, parameterCountBillion: 405.0, isFrontier: true },

  // Non-frontier comparative architectures
  { modelName: 'Legacy-Dense-13B', architectureFamily: 'Standard Dense', latencyMs: 36.8, accuracyScore: 76.4, parameterCountBillion: 13.0, isFrontier: false },
  { modelName: 'Quantized-4bit-70B', architectureFamily: 'Standard Dense', latencyMs: 44.2, accuracyScore: 83.1, parameterCountBillion: 70.0, isFrontier: false },
  { modelName: 'Linear-Attention-8B', architectureFamily: 'Sub-quadratic', latencyMs: 18.9, accuracyScore: 71.0, parameterCountBillion: 8.0, isFrontier: false },
  { modelName: 'Sliding-Window-32B', architectureFamily: 'Sub-quadratic', latencyMs: 48.0, accuracyScore: 80.5, parameterCountBillion: 32.0, isFrontier: false },
  { modelName: 'Bi-directional-MoE-27B', architectureFamily: 'Mixture of Experts', latencyMs: 42.0, accuracyScore: 79.8, parameterCountBillion: 27.0, isFrontier: false },
  { modelName: 'Pruned-Transformer-14B', architectureFamily: 'Standard Dense', latencyMs: 28.5, accuracyScore: 75.2, parameterCountBillion: 14.0, isFrontier: false },
];

function validatePareto(raw: unknown): DataValidationResult<ModelParetoEntry[]> {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { valid: false, errors: ['Expected array of Pareto frontier model evaluation records.'] };
  }
  const validated = raw.map((r) => ({
    modelName: String(r.modelName ?? 'Model'),
    architectureFamily: String(r.architectureFamily ?? 'Architecture'),
    latencyMs: Number(r.latencyMs ?? 10),
    accuracyScore: Number(r.accuracyScore ?? 70),
    parameterCountBillion: Number(r.parameterCountBillion ?? 7),
    isFrontier: Boolean(r.isFrontier ?? false),
  }));
  return { valid: true, data: validated, recordCount: validated.length };
}

const ParetoFrontierGraphic: React.FC<FrameworkRenderProps<ModelParetoEntry[], ParetoConfig>> = ({
  data,
  config,
  bounds,
  theme,
}) => {
  const { innerWidth, innerHeight } = bounds;

  const plotMargin = { left: 45, right: 35, top: 25, bottom: 45 };
  const pWidth = innerWidth - plotMargin.left - plotMargin.right;
  const pHeight = innerHeight - plotMargin.top - plotMargin.bottom;

  const maxLat = Math.max(125, d3.max(data, (d) => d.latencyMs) ?? 100);
  const minScore = Math.min(65, d3.min(data, (d) => d.accuracyScore) ?? 60);
  const maxScore = Math.max(95, d3.max(data, (d) => d.accuracyScore) ?? 95);

  const xScale = d3.scaleLinear().domain([0, maxLat]).range([0, pWidth]).nice();
  const yScale = d3.scaleLinear().domain([minScore - 3, maxScore + 2]).range([pHeight, 0]).nice();

  const rScale = d3.scaleSqrt().domain([5, 450]).range([4.5, 14]);

  const xTicks = xScale.ticks(7);
  const yTicks = yScale.ticks(6);

  // Extract and sort frontier models by latency for monotonic stepped hull
  const frontierPoints = data.filter((d) => d.isFrontier).sort((a, b) => a.latencyMs - b.latencyMs);

  const frontierLine = d3
    .line<ModelParetoEntry>()
    .x((d) => xScale(d.latencyMs))
    .y((d) => yScale(d.accuracyScore))
    .curve(d3.curveMonotoneX);

  const frontierArea = d3
    .area<ModelParetoEntry>()
    .x((d) => xScale(d.latencyMs))
    .y0(pHeight)
    .y1((d) => yScale(d.accuracyScore))
    .curve(d3.curveMonotoneX);

  const families = Array.from(new Set(data.map((d) => d.architectureFamily)));

  return (
    <g transform={`translate(${plotMargin.left}, ${plotMargin.top})`}>
      {/* SLA Target Constraint Box (Feasible Deployment Region) */}
      <rect
        x={0}
        y={yScale(config.minAcceptableScore)}
        width={xScale(config.maxAcceptableLatency)}
        height={pHeight - yScale(config.minAcceptableScore)}
        fill="url(#pattern-hatch-diagonal)"
      />
      <rect
        x={0}
        y={yScale(config.minAcceptableScore)}
        width={xScale(config.maxAcceptableLatency)}
        height={pHeight - yScale(config.minAcceptableScore)}
        fill={theme.accentPrimary}
        fillOpacity={0.06}
        stroke={theme.accentPrimary}
        strokeWidth={1}
        strokeDasharray="4 3"
      />
      <text
        x={xScale(config.maxAcceptableLatency) - 8}
        y={yScale(config.minAcceptableScore) - 6}
        textAnchor="end"
        fill={theme.accentPrimary}
        fontFamily={theme.fontFamilyMono}
        fontSize={9}
        fontWeight={700}
        filter="url(#filter-text-halo)"
      >
        FEASIBLE DEPLOYMENT REGION (≤{config.maxAcceptableLatency}ms, ≥{config.minAcceptableScore}%)
      </text>

      {/* Gridlines */}
      {xTicks.map((xVal) => (
        <g key={`px-${xVal}`} transform={`translate(${xScale(xVal)}, 0)`}>
          <line y1={0} y2={pHeight} stroke={theme.gridline} strokeWidth={1} strokeDasharray="3 3" />
          <text y={pHeight + 18} textAnchor="middle" fill={theme.inkMuted} fontFamily={theme.fontFamilyMono} fontSize={10}>
            {xVal}
          </text>
        </g>
      ))}

      {yTicks.map((yVal) => (
        <g key={`py-${yVal}`} transform={`translate(0, ${yScale(yVal)})`}>
          <line x1={0} x2={pWidth} stroke={theme.gridline} strokeWidth={1} strokeDasharray="3 3" />
          <text x={-8} y={3.5} textAnchor="end" fill={theme.inkMuted} fontFamily={theme.fontFamilyMono} fontSize={10}>
            {yVal}%
          </text>
        </g>
      ))}

      {/* Pareto Frontier Convex Hull & Shading */}
      {config.showFrontierEnvelope && frontierPoints.length > 1 && (
        <>
          <path d={frontierArea(frontierPoints) ?? ''} fill={theme.palette.significance.confidenceBand} fillOpacity={0.25} />
          <path d={frontierLine(frontierPoints) ?? ''} fill="none" stroke={theme.accentPrimary} strokeWidth={2.4} />
        </>
      )}

      {/* Axes */}
      <line x1={0} y1={pHeight} x2={pWidth} y2={pHeight} stroke={theme.axisLine} strokeWidth={1.2} />
      <line x1={0} y1={0} x2={0} y2={pHeight} stroke={theme.axisLine} strokeWidth={1.2} />

      {/* Scatter Nodes */}
      {data.map((m) => {
        const cx = xScale(m.latencyMs);
        const cy = yScale(m.accuracyScore);
        const famIdx = families.indexOf(m.architectureFamily);
        const color = theme.palette.categorical[famIdx % theme.palette.categorical.length];
        const r = config.scaleByParameterSize ? rScale(m.parameterCountBillion) : 6;

        return (
          <g key={m.modelName}>
            {m.isFrontier && (
              <circle cx={cx} cy={cy} r={r + 3.5} fill="none" stroke={theme.accentPrimary} strokeWidth={1.5} strokeDasharray="3 2" />
            )}
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill={color}
              stroke={theme.background}
              strokeWidth={1.5}
            />
            {/* Direct Model Name Badge */}
            <text
              x={cx + r + 5}
              y={cy + 3.5}
              fill={m.isFrontier ? theme.inkPrimary : theme.inkSecondary}
              fontFamily={theme.fontFamilyMono}
              fontSize={m.isFrontier ? 10 : 9}
              fontWeight={m.isFrontier ? 700 : 500}
              filter="url(#filter-text-halo)"
            >
              {m.modelName} ({m.parameterCountBillion}B)
            </text>
          </g>
        );
      })}

      {/* Axis Labels */}
      <text x={pWidth / 2} y={pHeight + 36} textAnchor="middle" fill={theme.inkSecondary} fontSize={11.5} fontWeight={600}>
        Inference Latency (ms per token) → Lower is Faster
      </text>
      <text
        transform={`translate(-32, ${pHeight / 2}) rotate(-90)`}
        textAnchor="middle"
        fill={theme.inkSecondary}
        fontSize={11.5}
        fontWeight={600}
      >
        MMLU Reasoning Benchmark Accuracy (%) → Higher is Better
      </text>
    </g>
  );
};

export const paretoFrontierFramework: VisualFramework<ModelParetoEntry[], ParetoConfig> = {
  id: 'pareto-efficiency-frontier',
  name: 'Multi-Objective Pareto Efficiency Frontier',
  category: 'AI Systems & Trade-off Frontiers',
  description:
    'Evaluates Pareto dominance frontiers between inference latency and accuracy across foundation model architectures with parameter-scaled bubble nodes and feasible deployment regions.',
  defaultDimensions: { width: 940, height: 600, margin: { top: 88, right: 36, bottom: 44, left: 36 } },
  defaultMetadata: {
    figureLabel: 'FIGURE 4 // MODEL TRADEOFF FRONTIER',
    title: 'Pareto Optimal Inference Latency vs. Reasoning Accuracy',
    subtitle: 'MMLU 5-shot evaluation on NVIDIA H100 Tensor Core GPUs with FP8 matrix tensor precision.',
    footnote: 'Curved blue envelope indicates non-dominated Pareto frontier. Node radii are scaled to model parameter count (Billion weights).',
    source: 'Large-Scale LLM Benchmarking Consortium — Release 2026.1',
    credit: 'GBG Research Engine',
  },
  defaultConfig: {
    showFrontierEnvelope: true,
    scaleByParameterSize: true,
    minAcceptableScore: 75.0,
    maxAcceptableLatency: 50.0,
  },
  parameters: [
    { key: 'showFrontierEnvelope', label: 'Draw Pareto Dominance Hull', type: 'boolean' },
    { key: 'scaleByParameterSize', label: 'Scale Bubble by Parameter Count (√B)', type: 'boolean' },
    { key: 'minAcceptableScore', label: 'Min Acceptable Accuracy (%)', type: 'number', min: 65, max: 90, step: 1 },
    { key: 'maxAcceptableLatency', label: 'Max Acceptable Latency (ms)', type: 'number', min: 20, max: 100, step: 5 },
  ],
  sampleData: SAMPLE_PARETO_DATA,
  dataSchemaDescription:
    'Array of records: modelName (string), architectureFamily (string), latencyMs (number), accuracyScore (number), parameterCountBillion (number), isFrontier (boolean).',
  validateData: validatePareto,
  Component: ParetoFrontierGraphic,
};
