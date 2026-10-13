import React from 'react';
import * as d3 from 'd3';
import type { DataValidationResult, FrameworkRenderProps, VisualFramework } from '../core/types';

export interface CurvePoint {
  falsePositiveRate: number;
  truePositiveRate: number;
}

export interface ModelRocEntry {
  modelId: string;
  modelName: string;
  aucScore: number;
  optimalThreshold: { fpr: number; tpr: number; threshold: number };
  curve: CurvePoint[];
}

export interface RocConfig {
  showChanceDiagonal: boolean;
  showYoudenOptimalPoints: boolean;
  showInsetBarGraph: boolean;
  strokeWidth: number;
}

const SAMPLE_ROC_DATA: ModelRocEntry[] = [
  {
    modelId: 'm1',
    modelName: 'Deep Multi-Modal Ensemble',
    aucScore: 0.942,
    optimalThreshold: { fpr: 0.12, tpr: 0.89, threshold: 0.42 },
    curve: [
      { falsePositiveRate: 0.0, truePositiveRate: 0.0 },
      { falsePositiveRate: 0.02, truePositiveRate: 0.48 },
      { falsePositiveRate: 0.06, truePositiveRate: 0.76 },
      { falsePositiveRate: 0.12, truePositiveRate: 0.89 },
      { falsePositiveRate: 0.22, truePositiveRate: 0.94 },
      { falsePositiveRate: 0.40, truePositiveRate: 0.97 },
      { falsePositiveRate: 0.70, truePositiveRate: 0.99 },
      { falsePositiveRate: 1.0, truePositiveRate: 1.0 },
    ],
  },
  {
    modelId: 'm2',
    modelName: 'Vision-Language Foundation Model',
    aucScore: 0.885,
    optimalThreshold: { fpr: 0.18, tpr: 0.81, threshold: 0.51 },
    curve: [
      { falsePositiveRate: 0.0, truePositiveRate: 0.0 },
      { falsePositiveRate: 0.04, truePositiveRate: 0.35 },
      { falsePositiveRate: 0.10, truePositiveRate: 0.65 },
      { falsePositiveRate: 0.18, truePositiveRate: 0.81 },
      { falsePositiveRate: 0.32, truePositiveRate: 0.89 },
      { falsePositiveRate: 0.55, truePositiveRate: 0.94 },
      { falsePositiveRate: 0.80, truePositiveRate: 0.98 },
      { falsePositiveRate: 1.0, truePositiveRate: 1.0 },
    ],
  },
  {
    modelId: 'm3',
    modelName: 'Clinical Tabular XGBoost',
    aucScore: 0.812,
    optimalThreshold: { fpr: 0.24, tpr: 0.72, threshold: 0.58 },
    curve: [
      { falsePositiveRate: 0.0, truePositiveRate: 0.0 },
      { falsePositiveRate: 0.08, truePositiveRate: 0.28 },
      { falsePositiveRate: 0.16, truePositiveRate: 0.54 },
      { falsePositiveRate: 0.24, truePositiveRate: 0.72 },
      { falsePositiveRate: 0.45, truePositiveRate: 0.82 },
      { falsePositiveRate: 0.68, truePositiveRate: 0.90 },
      { falsePositiveRate: 0.85, truePositiveRate: 0.95 },
      { falsePositiveRate: 1.0, truePositiveRate: 1.0 },
    ],
  },
];

function validateRoc(raw: unknown): DataValidationResult<ModelRocEntry[]> {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { valid: false, errors: ['Expected array of ROC model curves.'] };
  }
  const validated = raw.map((r, i) => ({
    modelId: String(r.modelId ?? `m-${i}`),
    modelName: String(r.modelName ?? `Model ${i}`),
    aucScore: Number(r.aucScore ?? 0.8),
    optimalThreshold: r.optimalThreshold ?? { fpr: 0.2, tpr: 0.8, threshold: 0.5 },
    curve: Array.isArray(r.curve) ? r.curve : [],
  }));
  return { valid: true, data: validated, recordCount: validated.length };
}

const RocComparisonGraphic: React.FC<FrameworkRenderProps<ModelRocEntry[], RocConfig>> = ({
  data,
  config,
  bounds,
  theme,
}) => {
  const { innerWidth, innerHeight } = bounds;

  const plotMargin = { left: 45, right: 35, top: 20, bottom: 45 };
  const pWidth = innerWidth - plotMargin.left - plotMargin.right;
  const pHeight = innerHeight - plotMargin.top - plotMargin.bottom;

  const xScale = d3.scaleLinear().domain([0, 1]).range([0, pWidth]);
  const yScale = d3.scaleLinear().domain([0, 1]).range([pHeight, 0]);

  const ticks = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <g transform={`translate(${plotMargin.left}, ${plotMargin.top})`}>
      {/* Gridlines */}
      {ticks.map((t) => (
        <g key={`roc-x-${t}`} transform={`translate(${xScale(t)}, 0)`}>
          <line y1={0} y2={pHeight} stroke={theme.gridline} strokeWidth={1} strokeDasharray="3 3" />
          <text y={pHeight + 18} textAnchor="middle" fill={theme.inkMuted} fontFamily={theme.fontFamilyMono} fontSize={10}>
            {t.toFixed(1)}
          </text>
        </g>
      ))}

      {ticks.map((t) => (
        <g key={`roc-y-${t}`} transform={`translate(0, ${yScale(t)})`}>
          <line x1={0} x2={pWidth} stroke={theme.gridline} strokeWidth={1} strokeDasharray="3 3" />
          <text x={-8} y={3.5} textAnchor="end" fill={theme.inkMuted} fontFamily={theme.fontFamilyMono} fontSize={10}>
            {t.toFixed(1)}
          </text>
        </g>
      ))}

      {/* Random Chance Diagonal Line (AUC = 0.50) */}
      {config.showChanceDiagonal && (
        <line
          x1={xScale(0)}
          y1={yScale(0)}
          x2={xScale(1)}
          y2={yScale(1)}
          stroke={theme.inkMuted}
          strokeWidth={1.2}
          strokeDasharray="6 4"
        />
      )}

      {/* Model ROC Curves */}
      {data.map((model, mIdx) => {
        const color = theme.palette.categorical[mIdx % theme.palette.categorical.length];
        const lineGen = d3
          .line<CurvePoint>()
          .x((d) => xScale(d.falsePositiveRate))
          .y((d) => yScale(d.truePositiveRate))
          .curve(d3.curveMonotoneX);

        const areaGen = d3
          .area<CurvePoint>()
          .x((d) => xScale(d.falsePositiveRate))
          .y0(pHeight)
          .y1((d) => yScale(d.truePositiveRate))
          .curve(d3.curveMonotoneX);

        return (
          <g key={model.modelId}>
            {mIdx === 0 && (
              <path d={areaGen(model.curve) ?? ''} fill={color} fillOpacity={0.08} />
            )}
            <path d={lineGen(model.curve) ?? ''} fill="none" stroke={color} strokeWidth={config.strokeWidth} />

            {/* Optimal Youden Index (J = max(TPR - FPR)) Node */}
            {config.showYoudenOptimalPoints && (
              <g transform={`translate(${xScale(model.optimalThreshold.fpr)}, ${yScale(model.optimalThreshold.tpr)})`}>
                <circle r={5} fill={color} stroke={theme.background} strokeWidth={1.5} />
                <text
                  x={8}
                  y={-6}
                  fill={theme.inkPrimary}
                  fontFamily={theme.fontFamilyMono}
                  fontSize={9}
                  fontWeight={700}
                  filter="url(#filter-text-halo)"
                >
                  J* (θ = {model.optimalThreshold.threshold})
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Coordinate axes */}
      <line x1={0} y1={pHeight} x2={pWidth} y2={pHeight} stroke={theme.axisLine} strokeWidth={1.2} />
      <line x1={0} y1={0} x2={0} y2={pHeight} stroke={theme.axisLine} strokeWidth={1.2} />

      {/* Axis Labels */}
      <text x={pWidth / 2} y={pHeight + 36} textAnchor="middle" fill={theme.inkSecondary} fontSize={11.5} fontWeight={600}>
        False Positive Rate (1 − Specificity)
      </text>
      <text
        transform={`translate(-30, ${pHeight / 2}) rotate(-90)`}
        textAnchor="middle"
        fill={theme.inkSecondary}
        fontSize={11.5}
        fontWeight={600}
      >
        True Positive Rate (Sensitivity)
      </text>

      {/* Floating AUC Leaderboard Inset */}
      {config.showInsetBarGraph && (
        <g transform={`translate(${pWidth - 280}, ${pHeight - 160})`}>
          <rect width={270} height={145} rx={4} fill={theme.background} stroke={theme.gridline} strokeWidth={1} />
          <text x={12} y={20} fill={theme.inkSecondary} fontFamily={theme.fontFamilyMono} fontSize={9.5} fontWeight={700}>
            DISCRIMINATION ACCURACY (AUC-ROC)
          </text>
          <line x1={12} y1={26} x2={258} y2={26} stroke={theme.gridline} strokeWidth={0.8} />

          {data.map((model, idx) => {
            const color = theme.palette.categorical[idx % theme.palette.categorical.length];
            const rowY = 46 + idx * 36;
            const barW = (model.aucScore / 1.0) * 120;

            return (
              <g key={`lead-${model.modelId}`} transform={`translate(12, ${rowY})`}>
                <text x={0} y={0} fill={theme.inkPrimary} fontSize={10} fontWeight={600}>
                  {model.modelName}
                </text>
                <text x={246} y={0} textAnchor="end" fill={color} fontFamily={theme.fontFamilyMono} fontSize={10.5} fontWeight={700}>
                  {model.aucScore.toFixed(3)}
                </text>
                {/* Horizontal mini bar */}
                <rect x={0} y={6} width={246} height={6} rx={2} fill={theme.gridline} />
                <rect x={0} y={6} width={barW * 2.05} height={6} rx={2} fill={color} />
              </g>
            );
          })}
        </g>
      )}
    </g>
  );
};

export const rocComparisonFramework: VisualFramework<ModelRocEntry[], RocConfig> = {
  id: 'roc-multi-model-comparison',
  name: 'Multi-Model ROC Discrimination & Youden Index',
  category: 'Diagnostic Evaluation & Machine Learning',
  description:
    'Receiver Operating Characteristic (ROC) curves with diagonal chance baseline, optimal Youden index operating points, and integrated AUC discrimination leaderboard inset.',
  defaultDimensions: { width: 920, height: 600, margin: { top: 88, right: 36, bottom: 44, left: 36 } },
  defaultMetadata: {
    figureLabel: 'FIGURE 10 // DIAGNOSTIC PERFORMANCE',
    title: 'Receiver Operating Characteristic Across Diagnostic AI Models',
    subtitle: 'Prospective multicenter clinical validation (N = 4,200 patient biopsies) for malignant lesion classification.',
    footnote: 'J* circles indicate optimal decision threshold maximizing Youden’s index (Sensitivity + Specificity − 1).',
    source: 'National Cancer Biomarker Validation Registry',
    credit: 'GBG Research Engine',
  },
  defaultConfig: {
    showChanceDiagonal: true,
    showYoudenOptimalPoints: true,
    showInsetBarGraph: true,
    strokeWidth: 2.6,
  },
  parameters: [
    { key: 'showChanceDiagonal', label: 'Draw Chance Diagonal Line (AUC=0.5)', type: 'boolean' },
    { key: 'showYoudenOptimalPoints', label: 'Display Optimal Youden J* Nodes', type: 'boolean' },
    { key: 'showInsetBarGraph', label: 'Display Inset AUC Leaderboard', type: 'boolean' },
    { key: 'strokeWidth', label: 'ROC Curve Stroke Width (px)', type: 'number', min: 1.5, max: 4.5, step: 0.5 },
  ],
  sampleData: SAMPLE_ROC_DATA,
  dataSchemaDescription:
    'Array of models: modelId (string), modelName (string), aucScore (number), optimalThreshold ({ fpr, tpr, threshold }), curve (array of { falsePositiveRate, truePositiveRate }).',
  validateData: validateRoc,
  Component: RocComparisonGraphic,
};
