import React from 'react';
import * as d3 from 'd3';
import type { DataValidationResult, FrameworkRenderProps, VisualFramework } from '../core/types';

export interface VolcanoFeature {
  featureId: string;
  geneSymbol: string;
  log2FoldChange: number;
  negLog10PValue: number;
  biotype: string;
  isSignificant: boolean;
}

export interface VolcanoConfig {
  fcCutoff: number;
  pCutoff: number;
  highlightBiotype: string;
  showQuadrantHatching: boolean;
  maxLabeledGenes: number;
}

const SAMPLE_VOLCANO_DATA: VolcanoFeature[] = [
  // Top Up-regulated genes
  { featureId: 'ENSG001', geneSymbol: 'CXCL10', log2FoldChange: 3.84, negLog10PValue: 8.42, biotype: 'Immune Chemokine', isSignificant: true },
  { featureId: 'ENSG002', geneSymbol: 'IFNG', log2FoldChange: 3.12, negLog10PValue: 7.91, biotype: 'Immune Cytokine', isSignificant: true },
  { featureId: 'ENSG003', geneSymbol: 'GZMB', log2FoldChange: 2.78, negLog10PValue: 6.84, biotype: 'Cytotoxic Effector', isSignificant: true },
  { featureId: 'ENSG004', geneSymbol: 'PRF1', log2FoldChange: 2.45, negLog10PValue: 6.12, biotype: 'Cytotoxic Effector', isSignificant: true },
  { featureId: 'ENSG005', geneSymbol: 'STAT1', log2FoldChange: 2.15, negLog10PValue: 5.48, biotype: 'Transcription Factor', isSignificant: true },
  { featureId: 'ENSG006', geneSymbol: 'LAG3', log2FoldChange: 1.95, negLog10PValue: 4.82, biotype: 'Checkpoint Receptor', isSignificant: true },
  { featureId: 'ENSG007', geneSymbol: 'CD274', log2FoldChange: 1.82, negLog10PValue: 4.21, biotype: 'Checkpoint Ligand', isSignificant: true },
  { featureId: 'ENSG008', geneSymbol: 'IDO1', log2FoldChange: 2.95, negLog10PValue: 7.15, biotype: 'Metabolic Enzyme', isSignificant: true },

  // Top Down-regulated genes
  { featureId: 'ENSG009', geneSymbol: 'VEGFA', log2FoldChange: -2.85, negLog10PValue: 6.94, biotype: 'Angiogenic Factor', isSignificant: true },
  { featureId: 'ENSG010', geneSymbol: 'TGFB1', log2FoldChange: -2.42, negLog10PValue: 5.76, biotype: 'Immunosuppressive', isSignificant: true },
  { featureId: 'ENSG011', geneSymbol: 'FOXP3', log2FoldChange: -2.10, negLog10PValue: 5.15, biotype: 'Treg Marker', isSignificant: true },
  { featureId: 'ENSG012', geneSymbol: 'ARG1', log2FoldChange: -3.20, negLog10PValue: 7.42, biotype: 'Metabolic Enzyme', isSignificant: true },
  { featureId: 'ENSG013', geneSymbol: 'IL10', log2FoldChange: -1.95, negLog10PValue: 4.60, biotype: 'Immunosuppressive', isSignificant: true },
  { featureId: 'ENSG014', geneSymbol: 'MMP9', log2FoldChange: -2.65, negLog10PValue: 6.22, biotype: 'Matrix Remodeling', isSignificant: true },

  // Background non-significant genes (bulk cloud)
  { featureId: 'ENSG015', geneSymbol: 'ACTB', log2FoldChange: 0.12, negLog10PValue: 0.42, biotype: 'Housekeeping', isSignificant: false },
  { featureId: 'ENSG016', geneSymbol: 'GAPDH', log2FoldChange: -0.08, negLog10PValue: 0.31, biotype: 'Housekeeping', isSignificant: false },
  { featureId: 'ENSG017', geneSymbol: 'TUBB', log2FoldChange: 0.18, negLog10PValue: 0.65, biotype: 'Housekeeping', isSignificant: false },
  { featureId: 'ENSG018', geneSymbol: 'B2M', log2FoldChange: 0.45, negLog10PValue: 1.12, biotype: 'Antigen Presentation', isSignificant: false },
  { featureId: 'ENSG019', geneSymbol: 'RPL13A', log2FoldChange: -0.15, negLog10PValue: 0.52, biotype: 'Ribosomal', isSignificant: false },
  { featureId: 'ENSG020', geneSymbol: 'PPIA', log2FoldChange: 0.05, negLog10PValue: 0.22, biotype: 'Housekeeping', isSignificant: false },
  { featureId: 'ENSG021', geneSymbol: 'HPRT1', log2FoldChange: -0.22, negLog10PValue: 0.78, biotype: 'Housekeeping', isSignificant: false },
  { featureId: 'ENSG022', geneSymbol: 'YWHAZ', log2FoldChange: 0.28, negLog10PValue: 0.95, biotype: 'Signaling', isSignificant: false },
  { featureId: 'ENSG023', geneSymbol: 'UBC', log2FoldChange: -0.35, negLog10PValue: 1.05, biotype: 'Ubiquitin', isSignificant: false },
  { featureId: 'ENSG024', geneSymbol: 'HMBS', log2FoldChange: 0.08, negLog10PValue: 0.18, biotype: 'Housekeeping', isSignificant: false },
  { featureId: 'ENSG025', geneSymbol: 'TBP', log2FoldChange: -0.04, negLog10PValue: 0.12, biotype: 'Transcription', isSignificant: false },
  { featureId: 'ENSG026', geneSymbol: 'PGK1', log2FoldChange: 0.62, negLog10PValue: 1.45, biotype: 'Metabolic', isSignificant: false },
  { featureId: 'ENSG027', geneSymbol: 'MAPK1', log2FoldChange: 0.75, negLog10PValue: 1.85, biotype: 'Kinase', isSignificant: false },
  { featureId: 'ENSG028', geneSymbol: 'TP53', log2FoldChange: -0.85, negLog10PValue: 1.72, biotype: 'Tumor Suppressor', isSignificant: false },
  { featureId: 'ENSG029', geneSymbol: 'AKT1', log2FoldChange: 0.92, negLog10PValue: 1.92, biotype: 'Kinase', isSignificant: false },
  { featureId: 'ENSG030', geneSymbol: 'MYC', log2FoldChange: -1.15, negLog10PValue: 1.88, biotype: 'Oncogene', isSignificant: false },
  { featureId: 'ENSG031', geneSymbol: 'EGFR', log2FoldChange: 1.25, negLog10PValue: 1.65, biotype: 'Receptor Tyrosine Kinase', isSignificant: false },
  { featureId: 'ENSG032', geneSymbol: 'CDK4', log2FoldChange: 0.82, negLog10PValue: 1.42, biotype: 'Cell Cycle', isSignificant: false },
];

function validateVolcano(raw: unknown): DataValidationResult<VolcanoFeature[]> {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { valid: false, errors: ['Expected array of volcano gene expression features.'] };
  }
  const validated = raw.map((r, i) => ({
    featureId: String(r.featureId ?? `feat-${i}`),
    geneSymbol: String(r.geneSymbol ?? `GENE_${i}`),
    log2FoldChange: Number(r.log2FoldChange ?? 0),
    negLog10PValue: Number(r.negLog10PValue ?? 0),
    biotype: String(r.biotype ?? 'Transcript'),
    isSignificant: Boolean(r.isSignificant ?? (Math.abs(Number(r.log2FoldChange)) >= 1.5 && Number(r.negLog10PValue) >= 2)),
  }));
  return { valid: true, data: validated, recordCount: validated.length };
}

const VolcanoGraphic: React.FC<FrameworkRenderProps<VolcanoFeature[], VolcanoConfig>> = ({
  data,
  config,
  bounds,
  theme,
}) => {
  const { innerWidth, innerHeight } = bounds;

  const maxAbsFc = Math.max(4.5, d3.max(data, (d) => Math.abs(d.log2FoldChange)) ?? 4);
  const maxP = Math.max(9, d3.max(data, (d) => d.negLog10PValue) ?? 8);

  const plotMargin = { left: 45, right: 30, top: 20, bottom: 45 };
  const pWidth = innerWidth - plotMargin.left - plotMargin.right;
  const pHeight = innerHeight - plotMargin.top - plotMargin.bottom;

  const xScale = d3.scaleLinear().domain([-maxAbsFc, maxAbsFc]).range([0, pWidth]);
  const yScale = d3.scaleLinear().domain([0, maxP]).range([pHeight, 0]).nice();

  const xTicks = xScale.ticks(9);
  const yTicks = yScale.ticks(6);

  const cutoffFcXLeft = xScale(-config.fcCutoff);
  const cutoffFcXRight = xScale(config.fcCutoff);
  const cutoffP_Y = yScale(config.pCutoff);

  // Filter significant genes for direct label callouts
  const labeledUp = data
    .filter((d) => d.log2FoldChange >= config.fcCutoff && d.negLog10PValue >= config.pCutoff)
    .sort((a, b) => b.negLog10PValue - a.negLog10PValue)
    .slice(0, Math.floor(config.maxLabeledGenes / 2));

  const labeledDown = data
    .filter((d) => d.log2FoldChange <= -config.fcCutoff && d.negLog10PValue >= config.pCutoff)
    .sort((a, b) => b.negLog10PValue - a.negLog10PValue)
    .slice(0, Math.floor(config.maxLabeledGenes / 2));

  const labeledFeatures = [...labeledUp, ...labeledDown];

  return (
    <g transform={`translate(${plotMargin.left}, ${plotMargin.top})`}>
      {/* Background Significant Quadrant Shading */}
      {config.showQuadrantHatching && (
        <>
          {/* Top-Right: Significantly Up-regulated */}
          <rect
            x={cutoffFcXRight}
            y={0}
            width={pWidth - cutoffFcXRight}
            height={cutoffP_Y}
            fill={theme.accentSecondary}
            fillOpacity={0.06}
          />
          {/* Top-Left: Significantly Down-regulated */}
          <rect
            x={0}
            y={0}
            width={cutoffFcXLeft}
            height={cutoffP_Y}
            fill={theme.accentPrimary}
            fillOpacity={0.06}
          />
        </>
      )}

      {/* Gridlines */}
      {xTicks.map((xVal) => (
        <g key={`vx-${xVal}`} transform={`translate(${xScale(xVal)}, 0)`}>
          <line y1={0} y2={pHeight} stroke={theme.gridline} strokeWidth={1} strokeDasharray="3 3" />
          <text y={pHeight + 18} textAnchor="middle" fill={theme.inkMuted} fontFamily={theme.fontFamilyMono} fontSize={10}>
            {xVal > 0 ? `+${xVal}` : xVal}
          </text>
        </g>
      ))}

      {yTicks.map((yVal) => (
        <g key={`vy-${yVal}`} transform={`translate(0, ${yScale(yVal)})`}>
          <line x1={0} x2={pWidth} stroke={theme.gridline} strokeWidth={1} strokeDasharray="3 3" />
          <text x={-8} y={3.5} textAnchor="end" fill={theme.inkMuted} fontFamily={theme.fontFamilyMono} fontSize={10}>
            {yVal}
          </text>
        </g>
      ))}

      {/* Fold-Change Cutoff Threshold Lines */}
      <line x1={cutoffFcXLeft} x2={cutoffFcXLeft} y1={0} y2={pHeight} stroke={theme.inkMuted} strokeWidth={1.2} strokeDasharray="4 3" />
      <line x1={cutoffFcXRight} x2={cutoffFcXRight} y1={0} y2={pHeight} stroke={theme.inkMuted} strokeWidth={1.2} strokeDasharray="4 3" />
      <line x1={0} x2={pWidth} y1={cutoffP_Y} y2={cutoffP_Y} stroke={theme.inkMuted} strokeWidth={1.2} strokeDasharray="4 3" />

      {/* Zero log2FC Axis */}
      <line x1={xScale(0)} x2={xScale(0)} y1={0} y2={pHeight} stroke={theme.axisLine} strokeWidth={1} />
      <line x1={0} x2={pWidth} y1={pHeight} y2={pHeight} stroke={theme.axisLine} strokeWidth={1.2} />
      <line x1={0} x2={0} y1={0} y2={pHeight} stroke={theme.axisLine} strokeWidth={1.2} />

      {/* Scatter Nodes */}
      {data.map((feat) => {
        const isUp = feat.log2FoldChange >= config.fcCutoff && feat.negLog10PValue >= config.pCutoff;
        const isDown = feat.log2FoldChange <= -config.fcCutoff && feat.negLog10PValue >= config.pCutoff;

        let nodeColor = theme.palette.significance.muted;
        let nodeRadius = 3.5;
        let opacity = 0.55;

        if (isUp) {
          nodeColor = theme.palette.categorical[1]; // Vermilion / Red
          nodeRadius = 5.5;
          opacity = 0.9;
        } else if (isDown) {
          nodeColor = theme.palette.categorical[0]; // Cerulean / Blue
          nodeRadius = 5.5;
          opacity = 0.9;
        }

        return (
          <circle
            key={feat.featureId}
            cx={xScale(feat.log2FoldChange)}
            cy={yScale(feat.negLog10PValue)}
            r={nodeRadius}
            fill={nodeColor}
            fillOpacity={opacity}
            stroke={theme.background}
            strokeWidth={1}
          />
        );
      })}

      {/* Gene Callout Labels */}
      {labeledFeatures.map((feat) => {
        const cx = xScale(feat.log2FoldChange);
        const cy = yScale(feat.negLog10PValue);
        const isUp = feat.log2FoldChange > 0;
        const labelOffset = isUp ? 8 : -8;
        const textAnchor = isUp ? 'start' : 'end';

        return (
          <g key={`lbl-${feat.featureId}`}>
            <line
              x1={cx}
              y1={cy}
              x2={cx + (isUp ? 6 : -6)}
              y2={cy - 4}
              stroke={theme.inkPrimary}
              strokeWidth={0.8}
            />
            <text
              x={cx + labelOffset}
              y={cy - 6}
              textAnchor={textAnchor}
              fill={theme.inkPrimary}
              fontFamily={theme.fontFamilyMono}
              fontSize={10}
              fontWeight={700}
              filter="url(#filter-text-halo)"
            >
              {feat.geneSymbol}
            </text>
          </g>
        );
      })}

      {/* Axis Titles */}
      <text
        x={pWidth / 2}
        y={pHeight + 36}
        textAnchor="middle"
        fill={theme.inkSecondary}
        fontSize={11.5}
        fontWeight={600}
      >
        Effect Size: log₂(Fold Change)
      </text>

      <text
        transform={`translate(-30, ${pHeight / 2}) rotate(-90)`}
        textAnchor="middle"
        fill={theme.inkSecondary}
        fontSize={11.5}
        fontWeight={600}
      >
        Statistical Significance: −log₁₀(p-value)
      </text>

      {/* Quadrant Legend Inset */}
      <g transform={`translate(${pWidth - 190}, 16)`}>
        <rect width={180} height={52} rx={3} fill={theme.background} stroke={theme.gridline} strokeWidth={1} />
        <circle cx={14} cy={17} r={4.5} fill={theme.palette.categorical[1]} />
        <text x={24} y={20} fill={theme.inkPrimary} fontSize={9.5} fontWeight={600}>
          Up-regulated (FC ≥ {config.fcCutoff})
        </text>
        <circle cx={14} cy={35} r={4.5} fill={theme.palette.categorical[0]} />
        <text x={24} y={38} fill={theme.inkPrimary} fontSize={9.5} fontWeight={600}>
          Down-regulated (FC ≤ −{config.fcCutoff})
        </text>
      </g>
    </g>
  );
};

export const volcanoFramework: VisualFramework<VolcanoFeature[], VolcanoConfig> = {
  id: 'volcano-transcriptomic',
  name: 'Volcano Plot with Significance Quadrants',
  category: 'Genomics & Differential Expression',
  description:
    'High-dimensional transcriptomic Volcano plot mapping log2(Fold Change) against -log10(p-value) with adjustable significance thresholds, shaded quadrants, and auto-haloed gene labels.',
  defaultDimensions: { width: 920, height: 600, margin: { top: 88, right: 36, bottom: 44, left: 36 } },
  defaultMetadata: {
    figureLabel: 'FIGURE 2 // TRANSCRIPTOMIC LANDSCAPE',
    title: 'Differential Gene Expression Following CAR-T Activation',
    subtitle: 'RNA-seq differential expression profiling (N = 32 biological replicates) comparing activated vs. resting states.',
    footnote: 'Horizontal line represents p = 0.01 (-log10 = 2.0). Vertical dashed lines indicate 1.5-fold change cutoffs.',
    source: 'Cellular Immunogenomics Core — Illumina NovaSeq 6000',
    credit: 'GBG Research Engine',
  },
  defaultConfig: {
    fcCutoff: 1.5,
    pCutoff: 2.0,
    highlightBiotype: 'all',
    showQuadrantHatching: true,
    maxLabeledGenes: 12,
  },
  parameters: [
    { key: 'fcCutoff', label: 'log2(Fold Change) Cutoff', type: 'number', min: 0.5, max: 3.5, step: 0.1 },
    { key: 'pCutoff', label: '-log10(p-value) Cutoff', type: 'number', min: 1.0, max: 4.0, step: 0.2 },
    { key: 'showQuadrantHatching', label: 'Shade Significance Quadrants', type: 'boolean' },
    { key: 'maxLabeledGenes', label: 'Maximum Labeled Top Genes', type: 'number', min: 4, max: 24, step: 2 },
  ],
  sampleData: SAMPLE_VOLCANO_DATA,
  dataSchemaDescription:
    'Array of records: featureId (string), geneSymbol (string), log2FoldChange (number), negLog10PValue (number), biotype (string), isSignificant (boolean).',
  validateData: validateVolcano,
  Component: VolcanoGraphic,
};
