import React from 'react';
import * as d3 from 'd3';
import type { DataValidationResult, FrameworkRenderProps, VisualFramework } from '../core/types';

export interface AlluvialTransition {
  sourceStage: string;
  targetStage: string;
  sourceCohort: string;
  targetCohort: string;
  volume: number;
}

export interface AlluvialConfig {
  nodeWidth: number;
  curvature: number;
  showVolumeLabels: boolean;
  opacity: number;
}

const SAMPLE_ALLUVIAL_DATA: AlluvialTransition[] = [
  // Stage 1 (Screened Cohort) -> Stage 2 (Molecular Stratification)
  { sourceStage: 'Enrollment', targetStage: 'Biomarker Stratum', sourceCohort: 'Screened (N=1000)', targetCohort: 'HER2+ Amplified', volume: 280 },
  { sourceStage: 'Enrollment', targetStage: 'Biomarker Stratum', sourceCohort: 'Screened (N=1000)', targetCohort: 'HR+/HER2- Luminal', volume: 460 },
  { sourceStage: 'Enrollment', targetStage: 'Biomarker Stratum', sourceCohort: 'Screened (N=1000)', targetCohort: 'Triple Negative (TNBC)', volume: 180 },
  { sourceStage: 'Enrollment', targetStage: 'Biomarker Stratum', sourceCohort: 'Screened (N=1000)', targetCohort: 'Ineligible / Screen Fail', volume: 80 },

  // Stage 2 -> Stage 3 (Allocated Regimen)
  { sourceStage: 'Biomarker Stratum', targetStage: 'Allocated Regimen', sourceCohort: 'HER2+ Amplified', targetCohort: 'Targeted ADC Combo', volume: 260 },
  { sourceStage: 'Biomarker Stratum', targetStage: 'Allocated Regimen', sourceCohort: 'HER2+ Amplified', targetCohort: 'Withdrawn / Discontinued', volume: 20 },
  { sourceStage: 'Biomarker Stratum', targetStage: 'Allocated Regimen', sourceCohort: 'HR+/HER2- Luminal', targetCohort: 'CDK4/6 Inhibitor + ET', volume: 430 },
  { sourceStage: 'Biomarker Stratum', targetStage: 'Allocated Regimen', sourceCohort: 'HR+/HER2- Luminal', targetCohort: 'Withdrawn / Discontinued', volume: 30 },
  { sourceStage: 'Biomarker Stratum', targetStage: 'Allocated Regimen', sourceCohort: 'Triple Negative (TNBC)', targetCohort: 'Immune Checkpoint Blockade', volume: 165 },
  { sourceStage: 'Biomarker Stratum', targetStage: 'Allocated Regimen', sourceCohort: 'Triple Negative (TNBC)', targetCohort: 'Withdrawn / Discontinued', volume: 15 },
  { sourceStage: 'Biomarker Stratum', targetStage: 'Allocated Regimen', sourceCohort: 'Ineligible / Screen Fail', targetCohort: 'Excluded from Trial', volume: 80 },

  // Stage 3 -> Stage 4 (6-Month Objective Response)
  { sourceStage: 'Allocated Regimen', targetStage: '6-Mo Clinical Outcome', sourceCohort: 'Targeted ADC Combo', targetCohort: 'Complete / Partial Response', volume: 195 },
  { sourceStage: 'Allocated Regimen', targetStage: '6-Mo Clinical Outcome', sourceCohort: 'Targeted ADC Combo', targetCohort: 'Stable Disease', volume: 45 },
  { sourceStage: 'Allocated Regimen', targetStage: '6-Mo Clinical Outcome', sourceCohort: 'Targeted ADC Combo', targetCohort: 'Disease Progression', volume: 20 },
  { sourceStage: 'Allocated Regimen', targetStage: '6-Mo Clinical Outcome', sourceCohort: 'CDK4/6 Inhibitor + ET', targetCohort: 'Complete / Partial Response', volume: 285 },
  { sourceStage: 'Allocated Regimen', targetStage: '6-Mo Clinical Outcome', sourceCohort: 'CDK4/6 Inhibitor + ET', targetCohort: 'Stable Disease', volume: 110 },
  { sourceStage: 'Allocated Regimen', targetStage: '6-Mo Clinical Outcome', sourceCohort: 'CDK4/6 Inhibitor + ET', targetCohort: 'Disease Progression', volume: 35 },
  { sourceStage: 'Allocated Regimen', targetStage: '6-Mo Clinical Outcome', sourceCohort: 'Immune Checkpoint Blockade', targetCohort: 'Complete / Partial Response', volume: 92 },
  { sourceStage: 'Allocated Regimen', targetStage: '6-Mo Clinical Outcome', sourceCohort: 'Immune Checkpoint Blockade', targetCohort: 'Stable Disease', volume: 38 },
  { sourceStage: 'Allocated Regimen', targetStage: '6-Mo Clinical Outcome', sourceCohort: 'Immune Checkpoint Blockade', targetCohort: 'Disease Progression', volume: 35 },
  { sourceStage: 'Allocated Regimen', targetStage: '6-Mo Clinical Outcome', sourceCohort: 'Withdrawn / Discontinued', targetCohort: 'Lost to Follow-up', volume: 65 },
  { sourceStage: 'Allocated Regimen', targetStage: '6-Mo Clinical Outcome', sourceCohort: 'Excluded from Trial', targetCohort: 'Non-Intervention Registry', volume: 80 },
];

function validateAlluvial(raw: unknown): DataValidationResult<AlluvialTransition[]> {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { valid: false, errors: ['Expected array of transition flow records.'] };
  }
  const validated = raw.map((r) => ({
    sourceStage: String(r.sourceStage ?? 'Stage A'),
    targetStage: String(r.targetStage ?? 'Stage B'),
    sourceCohort: String(r.sourceCohort ?? 'Cohort A'),
    targetCohort: String(r.targetCohort ?? 'Cohort B'),
    volume: Number(r.volume ?? 1),
  }));
  return { valid: true, data: validated, recordCount: validated.length };
}

const AlluvialGraphic: React.FC<FrameworkRenderProps<AlluvialTransition[], AlluvialConfig>> = ({
  data,
  config,
  bounds,
  theme,
}) => {
  const { innerWidth, innerHeight } = bounds;

  // Stages in chronological order
  const stages = ['Enrollment', 'Biomarker Stratum', 'Allocated Regimen', '6-Mo Clinical Outcome'];
  const stageColWidth = innerWidth / (stages.length - 1);
  const nodeW = config.nodeWidth;

  const topPadding = 38;
  const bottomPadding = 24;
  const usableHeight = innerHeight - topPadding - bottomPadding;

  // Build node totals per stage
  const stageNodes = stages.map((stageName) => {
    const cohorts = new Map<string, number>();
    data.forEach((d) => {
      if (d.sourceStage === stageName) {
        cohorts.set(d.sourceCohort, (cohorts.get(d.sourceCohort) ?? 0) + d.volume);
      }
      if (d.targetStage === stageName) {
        cohorts.set(d.targetCohort, (cohorts.get(d.targetCohort) ?? 0) + d.volume);
      }
    });
    const totalVolume = d3.sum(Array.from(cohorts.values()));
    return { stage: stageName, cohorts, totalVolume };
  });

  const maxTotal = d3.max(stageNodes, (s) => s.totalVolume) ?? 1000;
  const scaleY = (vol: number) => (vol / maxTotal) * (usableHeight - 60);

  // Compute node Y positions
  interface PlacedNode {
    cohort: string;
    stage: string;
    y: number;
    height: number;
    volume: number;
  }
  const placedNodes: PlacedNode[] = [];

  stageNodes.forEach((s) => {
    let currentY = topPadding;
    const entries = Array.from(s.cohorts.entries());
    entries.forEach(([cName, vol]) => {
      const h = Math.max(12, scaleY(vol));
      placedNodes.push({ cohort: cName, stage: s.stage, y: currentY, height: h, volume: vol });
      currentY += h + 8; // 8px gap between stacked nodes
    });
  });

  // Track vertical offsets for ribbon flows
  const sourceOffsets = new Map<string, number>();
  const targetOffsets = new Map<string, number>();

  return (
    <g className="alluvial-framework">
      {/* Stage Column Headers */}
      {stages.map((stageName, idx) => (
        <g key={`sh-${stageName}`} transform={`translate(${idx * stageColWidth}, 16)`}>
          <text
            x={idx === 0 ? 0 : idx === stages.length - 1 ? 0 : 0}
            y={0}
            fill={theme.inkSecondary}
            fontFamily={theme.fontFamilyMono}
            fontSize={10}
            fontWeight={700}
            letterSpacing="0.06em"
          >
            STAGE {idx + 1}: {stageName.toUpperCase()}
          </text>
          <line x1={0} y1={8} x2={nodeW + 20} y2={8} stroke={theme.inkPrimary} strokeWidth={1} />
        </g>
      ))}

      {/* Flow Ribbons (Cubic Bézier connecting nodes) */}
      <g className="alluvial-ribbons">
        {data.map((flow, fIdx) => {
          const sIdx = stages.indexOf(flow.sourceStage);
          const tIdx = stages.indexOf(flow.targetStage);
          if (sIdx === -1 || tIdx === -1) return null;

          const sNode = placedNodes.find((n) => n.stage === flow.sourceStage && n.cohort === flow.sourceCohort);
          const tNode = placedNodes.find((n) => n.stage === flow.targetStage && n.cohort === flow.targetCohort);
          if (!sNode || !tNode) return null;

          const ribbonH = scaleY(flow.volume);
          const sKey = `${flow.sourceStage}-${flow.sourceCohort}`;
          const tKey = `${flow.targetStage}-${flow.targetCohort}`;

          const sYOffset = sourceOffsets.get(sKey) ?? sNode.y;
          const tYOffset = targetOffsets.get(tKey) ?? tNode.y;

          sourceOffsets.set(sKey, sYOffset + ribbonH);
          targetOffsets.set(tKey, tYOffset + ribbonH);

          const x0 = sIdx * stageColWidth + nodeW;
          const x1 = tIdx * stageColWidth;
          const y0 = sYOffset;
          const y1 = tYOffset;

          const xi = d3.interpolateNumber(x0, x1);
          const x2 = xi(config.curvature);
          const x3 = xi(1 - config.curvature);

          const ribbonColor = theme.palette.categorical[fIdx % theme.palette.categorical.length];

          // Ribbon path
          const pathD = `M ${x0} ${y0} C ${x2} ${y0}, ${x3} ${y1}, ${x1} ${y1} L ${x1} ${y1 + ribbonH} C ${x3} ${y1 + ribbonH}, ${x2} ${y0 + ribbonH}, ${x0} ${y0 + ribbonH} Z`;

          return (
            <path
              key={`ribbon-${fIdx}`}
              d={pathD}
              fill={ribbonColor}
              fillOpacity={config.opacity}
              stroke={ribbonColor}
              strokeWidth={0.5}
            />
          );
        })}
      </g>

      {/* Stacked Cohort Nodes */}
      {placedNodes.map((node, nIdx) => {
        const sIdx = stages.indexOf(node.stage);
        const nodeX = sIdx * stageColWidth;
        const color = theme.palette.categorical[nIdx % theme.palette.categorical.length];

        return (
          <g key={`pnode-${node.stage}-${node.cohort}`} transform={`translate(${nodeX}, ${node.y})`}>
            <rect
              x={0}
              y={0}
              width={nodeW}
              height={node.height}
              rx={2}
              fill={color}
              stroke={theme.inkPrimary}
              strokeWidth={1}
            />
            {/* Cohort Label & Count */}
            <text
              x={nodeW + 6}
              y={Math.min(node.height / 2 + 4, 14)}
              fill={theme.inkPrimary}
              fontSize={10.5}
              fontWeight={600}
              filter="url(#filter-text-halo)"
            >
              {node.cohort}
            </text>
            <text
              x={nodeW + 6}
              y={Math.min(node.height / 2 + 16, 26)}
              fill={theme.inkMuted}
              fontFamily={theme.fontFamilyMono}
              fontSize={9}
              filter="url(#filter-text-halo)"
            >
              n={node.volume}
            </text>
          </g>
        );
      })}
    </g>
  );
};

export const alluvialFramework: VisualFramework<AlluvialTransition[], AlluvialConfig> = {
  id: 'alluvial-multistage-flow',
  name: 'Multistage Alluvial Flow & Cohort Trajectory',
  category: 'Cohort Dynamics & State Transitions',
  description:
    'Sankey-style multistage alluvial flow diagram with cubic Bézier streamlines tracking cohort transitions from trial enrollment through molecular stratification, therapy allocation, and clinical response.',
  defaultDimensions: { width: 1040, height: 600, margin: { top: 88, right: 36, bottom: 44, left: 36 } },
  defaultMetadata: {
    figureLabel: 'FIGURE 3 // TRIAL CONSORT ATTRITION',
    title: 'Patient Journey and Therapeutic Allocation Flow',
    subtitle: 'Prospective flow of 1,000 screened patients across clinical stratification, intervention arms, and 6-month RECIST outcomes.',
    footnote: 'Streamline ribbons are proportional to patient volume. Curvature parameter controls cubic Bézier inflection.',
    source: 'Phase II Basket Trial Consortium (Protocol BASKET-7)',
    credit: 'GBG Research Engine',
  },
  defaultConfig: {
    nodeWidth: 14,
    curvature: 0.48,
    showVolumeLabels: true,
    opacity: 0.42,
  },
  parameters: [
    { key: 'nodeWidth', label: 'Stage Node Width (px)', type: 'number', min: 8, max: 28, step: 2 },
    { key: 'curvature', label: 'Bézier Ribbon Curvature', type: 'number', min: 0.2, max: 0.8, step: 0.05 },
    { key: 'opacity', label: 'Ribbon Stream Opacity', type: 'number', min: 0.15, max: 0.85, step: 0.05 },
    { key: 'showVolumeLabels', label: 'Display Node Volumes', type: 'boolean' },
  ],
  sampleData: SAMPLE_ALLUVIAL_DATA,
  dataSchemaDescription:
    'Array of transitions: sourceStage (string), targetStage (string), sourceCohort (string), targetCohort (string), volume (number).',
  validateData: validateAlluvial,
  Component: AlluvialGraphic,
};
