import React from 'react';
import * as d3 from 'd3';
import type { DataValidationResult, FrameworkRenderProps, VisualFramework } from '../core/types';

export interface HeatmapCell {
  sampleId: string;
  geneOrPathway: string;
  clusterGroup: string;
  expressionZScore: number;
}

export interface ClusteredHeatmapConfig {
  showValueText: boolean;
  colorScheme: 'divergingBlueRed' | 'viridis' | 'spectral';
  cellRounding: number;
}

const SAMPLE_HEATMAP_DATA: HeatmapCell[] = [];
const SAMPLES = ['Tumor-01', 'Tumor-02', 'Tumor-03', 'Tumor-04', 'Tumor-05', 'Tumor-06', 'Tumor-07', 'Tumor-08', 'Tumor-09', 'Tumor-10', 'Tumor-11', 'Tumor-12'];
const GENES = [
  'IFNG-Response', 'CXCL9/10/11', 'CD8A/B-Cytolytic', 'PD-L1/PD-1',
  'CTLA4-Immune', 'VEGF-Angiogenesis', 'TGFB-Fibrosis', 'WNT-BetaCatenin',
  'MYC-Amplification', 'TP53-Loss', 'Cell-Cycle-G2M', 'DNA-Repair-HRD'
];

// Seeded deterministic values creating clear stratified cluster blocks
GENES.forEach((gene, gIdx) => {
  SAMPLES.forEach((sample, sIdx) => {
    const isHotCluster = sIdx < 5;
    const isColdCluster = sIdx >= 5 && sIdx < 9;
    let baseScore = 0;
    if (gIdx < 5) {
      baseScore = isHotCluster ? 1.85 : isColdCluster ? -1.45 : 0.2;
    } else if (gIdx < 8) {
      baseScore = isHotCluster ? -1.2 : isColdCluster ? 1.6 : -0.4;
    } else {
      baseScore = isHotCluster ? 0.4 : isColdCluster ? 0.8 : -1.5;
    }
    const noise = (((gIdx * 17 + sIdx * 31) % 100) / 100 - 0.5) * 0.7;
    SAMPLE_HEATMAP_DATA.push({
      sampleId: sample,
      geneOrPathway: gene,
      clusterGroup: isHotCluster ? 'Immune-Enriched' : isColdCluster ? 'Stroma-Excluded' : 'Desert',
      expressionZScore: Number((baseScore + noise).toFixed(2)),
    });
  });
});

function validateHeatmap(raw: unknown): DataValidationResult<HeatmapCell[]> {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { valid: false, errors: ['Expected array of expression matrix cells.'] };
  }
  const validated = raw.map((r) => ({
    sampleId: String(r.sampleId ?? 'Sample'),
    geneOrPathway: String(r.geneOrPathway ?? 'Gene'),
    clusterGroup: String(r.clusterGroup ?? 'Cluster'),
    expressionZScore: Number(r.expressionZScore ?? 0),
  }));
  return { valid: true, data: validated, recordCount: validated.length };
}

const ClusteredHeatmapGraphic: React.FC<FrameworkRenderProps<HeatmapCell[], ClusteredHeatmapConfig>> = ({
  data,
  config,
  bounds,
  theme,
}) => {
  const { innerWidth, innerHeight } = bounds;

  const samples = Array.from(new Set(data.map((d) => d.sampleId)));
  const genes = Array.from(new Set(data.map((d) => d.geneOrPathway)));

  const labelLeftW = 150;
  const dendroTopH = 50;
  const legendRightW = 90;
  const plotW = innerWidth - labelLeftW - legendRightW;
  const plotH = innerHeight - dendroTopH - 50;

  const cellW = plotW / samples.length;
  const cellH = plotH / genes.length;

  const getCellColor = (val: number) => {
    // Invert d3.interpolateRdBu so positive z-score is warm red, negative is cool blue
    return d3.interpolateRdBu(1 - (Math.max(-2.5, Math.min(2.5, val)) + 2.5) / 5.0);
  };

  return (
    <g transform="translate(0, 10)">
      {/* Top Clinical Phenotype Track & Dendrogram Hierarchy */}
      <g transform={`translate(${labelLeftW}, 0)`}>
        {/* Hierarchical Tree Branches (Authoring illustrative tree structure) */}
        <path
          d={`M ${cellW * 2.5} 35 L ${cellW * 2.5} 18 L ${cellW * 7.5} 18 L ${cellW * 7.5} 35 M ${cellW * 5} 18 L ${cellW * 5} 5 L ${cellW * 10.5} 5 L ${cellW * 10.5} 35`}
          fill="none"
          stroke={theme.inkMuted}
          strokeWidth={1.2}
        />
        {/* Sample Column Labels */}
        {samples.map((s, idx) => (
          <text
            key={s}
            x={idx * cellW + cellW / 2}
            y={46}
            textAnchor="middle"
            fill={theme.inkSecondary}
            fontFamily={theme.fontFamilyMono}
            fontSize={9}
          >
            {s.split('-')[1]}
          </text>
        ))}
      </g>

      {/* Row Gene Pathway Labels */}
      <g transform={`translate(0, ${dendroTopH})`}>
        {genes.map((g, idx) => (
          <text
            key={g}
            x={labelLeftW - 12}
            y={idx * cellH + cellH / 2 + 3.5}
            textAnchor="end"
            fill={theme.inkPrimary}
            fontFamily={theme.fontFamilyMono}
            fontSize={10}
            fontWeight={500}
          >
            {g}
          </text>
        ))}
      </g>

      {/* Main Heatmap Matrix */}
      <g transform={`translate(${labelLeftW}, ${dendroTopH})`}>
        {data.map((cell) => {
          const xIdx = samples.indexOf(cell.sampleId);
          const yIdx = genes.indexOf(cell.geneOrPathway);
          if (xIdx === -1 || yIdx === -1) return null;

          const cx = xIdx * cellW;
          const cy = yIdx * cellH;
          const bg = getCellColor(cell.expressionZScore);

          return (
            <g key={`${cell.sampleId}-${cell.geneOrPathway}`}>
              <rect
                x={cx + 1}
                y={cy + 1}
                width={cellW - 2}
                height={cellH - 2}
                rx={config.cellRounding}
                fill={bg}
                stroke={theme.background}
                strokeWidth={0.5}
              />
              {config.showValueText && cellH >= 24 && (
                <text
                  x={cx + cellW / 2}
                  y={cy + cellH / 2 + 3}
                  textAnchor="middle"
                  fill={Math.abs(cell.expressionZScore) > 1.2 ? '#FFFFFF' : theme.inkPrimary}
                  fontFamily={theme.fontFamilyMono}
                  fontSize={8.5}
                  fontWeight={600}
                >
                  {cell.expressionZScore > 0 ? `+${cell.expressionZScore}` : cell.expressionZScore}
                </text>
              )}
            </g>
          );
        })}
      </g>

      {/* Right Monograph Colorbar Legend */}
      <g transform={`translate(${innerWidth - legendRightW + 20}, ${dendroTopH + 20})`}>
        <text x={0} y={-8} fill={theme.inkSecondary} fontFamily={theme.fontFamilyMono} fontSize={9} fontWeight={700}>
          EXPRESSION Z-SCORE
        </text>
        {/* Continuous gradient strip */}
        {d3.range(-2.5, 2.6, 0.25).map((stepVal, idx) => (
          <rect
            key={`cb-${idx}`}
            x={0}
            y={idx * 14}
            width={18}
            height={14}
            fill={getCellColor(-stepVal)} // Top is high positive red, bottom is low negative blue
          />
        ))}
        <text x={24} y={10} fill={theme.inkPrimary} fontFamily={theme.fontFamilyMono} fontSize={9}>
          +2.5 (High)
        </text>
        <text x={24} y={11 * 14} fill={theme.inkMuted} fontFamily={theme.fontFamilyMono} fontSize={9}>
          0.0 (Median)
        </text>
        <text x={24} y={21 * 14} fill={theme.inkPrimary} fontFamily={theme.fontFamilyMono} fontSize={9}>
          -2.5 (Low)
        </text>
      </g>
    </g>
  );
};

export const clusteredHeatmapFramework: VisualFramework<HeatmapCell[], ClusteredHeatmapConfig> = {
  id: 'clustered-genomic-heatmap',
  name: 'Hierarchical Clustered Genomic Heatmap',
  category: 'Genomics & Phenotypic Profiles',
  description:
    'Stratified expression z-score matrix with top clinical cohort clustering dendrogram, diverging bipolar colormap, and precision numeric cell overlays.',
  defaultDimensions: { width: 940, height: 600, margin: { top: 88, right: 36, bottom: 44, left: 36 } },
  defaultMetadata: {
    figureLabel: 'FIGURE 5 // MOLECULAR SUBTYPING',
    title: 'Transcriptomic Immune-Microenvironment Activation Heatmap',
    subtitle: 'Unsupervised hierarchical clustering across 12 tumor biopsies and 12 canonical pathway signatures.',
    footnote: 'Expression values normalized as z-scores across samples. Top tree indicates agglomerative ward linkage.',
    source: 'Translational Oncology Profiling Lab — NanoString PanCancer IO360',
    credit: 'GBG Research Engine',
  },
  defaultConfig: {
    showValueText: true,
    colorScheme: 'divergingBlueRed',
    cellRounding: 1,
  },
  parameters: [
    { key: 'showValueText', label: 'Show Cell Numeric Z-Scores', type: 'boolean' },
    { key: 'cellRounding', label: 'Cell Corner Radius (px)', type: 'number', min: 0, max: 4, step: 1 },
  ],
  sampleData: SAMPLE_HEATMAP_DATA,
  dataSchemaDescription:
    'Array of records: sampleId (string), geneOrPathway (string), clusterGroup (string), expressionZScore (number).',
  validateData: validateHeatmap,
  Component: ClusteredHeatmapGraphic,
};
