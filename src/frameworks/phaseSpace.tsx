import React from 'react';
import * as d3 from 'd3';
import type { DataValidationResult, FrameworkRenderProps, VisualFramework } from '../core/types';

export interface PhasePoint {
  timeStep: number;
  systemState: string;
  positionX: number;
  velocityDx: number;
}

export interface PhaseSpaceConfig {
  showVectorField: boolean;
  orbitStrokeWidth: number;
  showAttractorZones: boolean;
  arrowheadsOnOrbit: boolean;
}

const SAMPLE_PHASE_DATA: PhasePoint[] = [];
// Generate dual trajectories: Orbit A (Stable Limit Cycle) & Orbit B (Damped Convergence to Fixed Point)
const steps = 60;
for (let i = 0; i <= steps; i++) {
  const t = (i / steps) * 4 * Math.PI;
  // Limit cycle orbit (Oscillatory attractor)
  const r1 = 3.2;
  SAMPLE_PHASE_DATA.push({
    timeStep: i,
    systemState: 'Limit Cycle Attractor (Coupled Non-linear)',
    positionX: Number((r1 * Math.cos(t)).toFixed(3)),
    velocityDx: Number((r1 * Math.sin(t) * 1.35).toFixed(3)),
  });

  // Damped transient decay orbit
  const r2 = Math.max(0.1, 5.0 * Math.exp(-t * 0.22));
  SAMPLE_PHASE_DATA.push({
    timeStep: i,
    systemState: 'Damped Transient Relaxation',
    positionX: Number((r2 * Math.cos(t + 0.6)).toFixed(3)),
    velocityDx: Number((r2 * Math.sin(t + 0.6) * 1.1).toFixed(3)),
  });
}

function validatePhase(raw: unknown): DataValidationResult<PhasePoint[]> {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { valid: false, errors: ['Expected array of phase space trajectory points.'] };
  }
  const validated = raw.map((r) => ({
    timeStep: Number(r.timeStep ?? 0),
    systemState: String(r.systemState ?? 'Orbit'),
    positionX: Number(r.positionX ?? 0),
    velocityDx: Number(r.velocityDx ?? 0),
  }));
  return { valid: true, data: validated, recordCount: validated.length };
}

const PhaseSpaceGraphic: React.FC<FrameworkRenderProps<PhasePoint[], PhaseSpaceConfig>> = ({
  data,
  config,
  bounds,
  theme,
}) => {
  const { innerWidth, innerHeight } = bounds;

  const plotMargin = { left: 45, right: 35, top: 20, bottom: 45 };
  const pWidth = innerWidth - plotMargin.left - plotMargin.right;
  const pHeight = innerHeight - plotMargin.top - plotMargin.bottom;

  const maxBound = 6.0;
  const xScale = d3.scaleLinear().domain([-maxBound, maxBound]).range([0, pWidth]);
  const yScale = d3.scaleLinear().domain([-maxBound, maxBound]).range([pHeight, 0]);

  const xTicks = [-4, -2, 0, 2, 4];
  const yTicks = [-4, -2, 0, 2, 4];

  const systems = Array.from(new Set(data.map((d) => d.systemState)));

  // Generate synthetic vector flow field background grid
  const vectorGrid: { x: number; y: number; u: number; v: number }[] = [];
  if (config.showVectorField) {
    const gridSteps = 9;
    const stepSize = (maxBound * 2) / gridSteps;
    for (let gx = -maxBound + stepSize / 2; gx <= maxBound; gx += stepSize) {
      for (let gy = -maxBound + stepSize / 2; gy <= maxBound; gy += stepSize) {
        // Van der Pol oscillator derivative field: dx/dt = y; dy/dt = mu*(1 - x^2)*y - x
        const u = gy * 0.4;
        const v = (1.0 * (1 - gx * gx * 0.15) * gy - gx) * 0.4;
        const mag = Math.sqrt(u * u + v * v) || 1;
        vectorGrid.push({ x: gx, y: gy, u: (u / mag) * 9, v: (v / mag) * 9 });
      }
    }
  }

  return (
    <g transform={`translate(${plotMargin.left}, ${plotMargin.top})`}>
      {/* Central Stability Attractor Basins */}
      {config.showAttractorZones && (
        <circle
          cx={xScale(0)}
          cy={yScale(0)}
          r={xScale(3.2) - xScale(0)}
          fill="none"
          stroke={theme.palette.significance.confidenceBand}
          strokeWidth={16}
          strokeDasharray="6 4"
        />
      )}

      {/* Gridlines */}
      {xTicks.map((xVal) => (
        <g key={`ps-x-${xVal}`} transform={`translate(${xScale(xVal)}, 0)`}>
          <line y1={0} y2={pHeight} stroke={theme.gridline} strokeWidth={1} strokeDasharray="3 3" />
          <text y={pHeight + 18} textAnchor="middle" fill={theme.inkMuted} fontFamily={theme.fontFamilyMono} fontSize={10}>
            {xVal}
          </text>
        </g>
      ))}

      {yTicks.map((yVal) => (
        <g key={`ps-y-${yVal}`} transform={`translate(0, ${yScale(yVal)})`}>
          <line x1={0} x2={pWidth} stroke={theme.gridline} strokeWidth={1} strokeDasharray="3 3" />
          <text x={-8} y={3.5} textAnchor="end" fill={theme.inkMuted} fontFamily={theme.fontFamilyMono} fontSize={10}>
            {yVal}
          </text>
        </g>
      ))}

      {/* Coordinate axes through origin (0,0) */}
      <line x1={0} x2={pWidth} y1={yScale(0)} y2={yScale(0)} stroke={theme.axisLine} strokeWidth={1.2} />
      <line x1={xScale(0)} x2={xScale(0)} y1={0} y2={pHeight} stroke={theme.axisLine} strokeWidth={1.2} />

      {/* Vector Field Directional Needles */}
      {config.showVectorField &&
        vectorGrid.map((vec, i) => {
          const px = xScale(vec.x);
          const py = yScale(vec.y);
          return (
            <line
              key={`vec-${i}`}
              x1={px - vec.u / 2}
              y1={py + vec.v / 2}
              x2={px + vec.u / 2}
              y2={py - vec.v / 2}
              stroke={theme.inkMuted}
              strokeOpacity={0.35}
              strokeWidth={1}
            />
          );
        })}

      {/* Orbit Trajectories */}
      {systems.map((sysName, sIdx) => {
        const points = data.filter((d) => d.systemState === sysName).sort((a, b) => a.timeStep - b.timeStep);
        const color = theme.palette.categorical[sIdx % theme.palette.categorical.length];

        const lineGen = d3
          .line<PhasePoint>()
          .x((d) => xScale(d.positionX))
          .y((d) => yScale(d.velocityDx))
          .curve(d3.curveCatmullRom.alpha(0.5));

        const startPt = points[0];
        const endPt = points[points.length - 1];

        return (
          <g key={sysName}>
            <path
              d={lineGen(points) ?? ''}
              fill="none"
              stroke={color}
              strokeWidth={config.orbitStrokeWidth}
              strokeLinecap="round"
            />
            {/* Start Node */}
            {startPt && (
              <circle
                cx={xScale(startPt.positionX)}
                cy={yScale(startPt.velocityDx)}
                r={4}
                fill={theme.background}
                stroke={color}
                strokeWidth={2}
              />
            )}
            {/* End Target Glyphs */}
            {endPt && (
              <circle
                cx={xScale(endPt.positionX)}
                cy={yScale(endPt.velocityDx)}
                r={5}
                fill={color}
              />
            )}
          </g>
        );
      })}

      {/* Axis Titles */}
      <text x={pWidth / 2} y={pHeight + 36} textAnchor="middle" fill={theme.inkSecondary} fontSize={11.5} fontWeight={600}>
        Canonical State Displacement x(t)
      </text>
      <text
        transform={`translate(-30, ${pHeight / 2}) rotate(-90)`}
        textAnchor="middle"
        fill={theme.inkSecondary}
        fontSize={11.5}
        fontWeight={600}
      >
        Phase Velocity Derivative ẋ(t) = dx/dt
      </text>

      {/* Floating Legend */}
      <g transform={`translate(${pWidth - 275}, 16)`}>
        <rect width={265} height={64} rx={3} fill={theme.background} stroke={theme.gridline} strokeWidth={1} />
        {systems.map((sysName, sIdx) => (
          <g key={sysName} transform={`translate(10, ${18 + sIdx * 24})`}>
            <line x1={0} y1={0} x2={16} y2={0} stroke={theme.palette.categorical[sIdx]} strokeWidth={2.5} />
            <text x={22} y={3.5} fill={theme.inkPrimary} fontSize={9.5} fontWeight={600}>
              {sysName}
            </text>
          </g>
        ))}
      </g>
    </g>
  );
};

export const phaseSpaceFramework: VisualFramework<PhasePoint[], PhaseSpaceConfig> = {
  id: 'phase-space-orbit',
  name: 'Nonlinear Dynamic Phase-Space Portrait',
  category: 'Dynamical Systems & Biophysics',
  description:
    'Continuous phase plane orbit trajectories mapping state position against velocity derivative with underlying vector flow fields and limit cycle attractor geometry.',
  defaultDimensions: { width: 920, height: 600, margin: { top: 88, right: 36, bottom: 44, left: 36 } },
  defaultMetadata: {
    figureLabel: 'FIGURE 6 // NONLINEAR DYNAMICS',
    title: 'Phase Plane Portrait of Coupled Neural Oscillators',
    subtitle: 'Evolutionary trajectories of limit cycle attraction vs. damped transient decay in state space.',
    footnote: 'Underlying needles illustrate the local velocity vector field. Axes centered at unperturbed equilibrium (0,0).',
    source: 'Theoretical Biophysics & Neural Computation Group',
    credit: 'GBG Research Engine',
  },
  defaultConfig: {
    showVectorField: true,
    orbitStrokeWidth: 2.2,
    showAttractorZones: true,
    arrowheadsOnOrbit: true,
  },
  parameters: [
    { key: 'showVectorField', label: 'Render Directional Vector Needles', type: 'boolean' },
    { key: 'orbitStrokeWidth', label: 'Orbit Stroke Width (px)', type: 'number', min: 1.0, max: 4.5, step: 0.5 },
    { key: 'showAttractorZones', label: 'Highlight Attractor Basin Boundary', type: 'boolean' },
  ],
  sampleData: SAMPLE_PHASE_DATA,
  dataSchemaDescription:
    'Array of records: timeStep (number), systemState (string), positionX (number), velocityDx (number).',
  validateData: validatePhase,
  Component: PhaseSpaceGraphic,
};
