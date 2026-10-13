import React from 'react';
import * as d3 from 'd3';
import {
  type FigureDimensions,
  type FigureMetadata,
  type PublicationTheme,
  computePlotBounds,
} from '../../core/types';
import { SvgDefs } from './SvgDefs';

export interface PublicationFigureProps {
  dimensions: FigureDimensions;
  metadata: FigureMetadata;
  theme: PublicationTheme;
  /** Toggle calibration overlay (margin bounds, sub-grid, coordinate rulers) */
  showCalibrationGrid?: boolean;
  /** Forwarded ref to the root `<svg>` element for direct vector/raster export */
  svgRef?: React.RefObject<SVGSVGElement | null>;
  children?: React.ReactNode;
}

/**
 * `<PublicationFigure>` is the foundational SVG container for all bespoke research graphics.
 * Everything—including editorial typography, rules, captions, and custom visual encodings—is
 * rendered inside a single calibrated `<svg>` coordinate space so exported files are 100% self-contained.
 */
export const PublicationFigure: React.FC<PublicationFigureProps> = ({
  dimensions,
  metadata,
  theme,
  showCalibrationGrid = false,
  svgRef,
  children,
}) => {
  const bounds = computePlotBounds(dimensions);
  const { width, height, margin, innerWidth, innerHeight } = bounds;

  // D3-generated calibration ticks for the optional inspection overlay
  const xCalibrationTicks = React.useMemo(() => {
    const scale = d3.scaleLinear().domain([0, innerWidth]).range([0, innerWidth]);
    return scale.ticks(Math.max(4, Math.floor(innerWidth / 100)));
  }, [innerWidth]);

  const yCalibrationTicks = React.useMemo(() => {
    const scale = d3.scaleLinear().domain([0, innerHeight]).range([0, innerHeight]);
    return scale.ticks(Math.max(4, Math.floor(innerHeight / 80)));
  }, [innerHeight]);

  const headerTopY = 26;
  const footerBaselineY = height - 18;

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{
        display: 'block',
        backgroundColor: theme.background,
        fontFamily: theme.fontFamilySans,
        userSelect: 'none',
      }}
      role="img"
      aria-label={metadata.title}
    >
      <SvgDefs theme={theme} />

      {/* 1. Background Paper Plate */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill={theme.background}
      />

      {/* Top Editorial Accent Bar (Signature journal plate rule) */}
      <line
        x1={margin.left}
        y1={14}
        x2={width - margin.right}
        y2={14}
        stroke={theme.inkPrimary}
        strokeWidth={2}
      />

      {/* 2. Header Block: Figure Identifier, Title, and Subtitle */}
      <g className="figure-header" transform={`translate(${margin.left}, ${headerTopY})`}>
        {metadata.figureLabel && (
          <text
            x={0}
            y={10}
            fill={theme.accentPrimary}
            fontFamily={theme.fontFamilyMono}
            fontSize={10.5}
            fontWeight={700}
            letterSpacing="0.08em"
          >
            {metadata.figureLabel.toUpperCase()}
          </text>
        )}

        <text
          x={0}
          y={metadata.figureLabel ? 31 : 16}
          fill={theme.inkPrimary}
          fontFamily={theme.fontFamilyTitle}
          fontSize={20}
          fontWeight={700}
          letterSpacing="-0.015em"
        >
          {metadata.title}
        </text>

        {metadata.subtitle && (
          <text
            x={0}
            y={metadata.figureLabel ? 50 : 35}
            fill={theme.inkSecondary}
            fontFamily={theme.fontFamilySans}
            fontSize={12.5}
            fontWeight={400}
          >
            {metadata.subtitle}
          </text>
        )}
      </g>

      {/* 3. Main Plotting Coordinate Space */}
      <g
        className="figure-plot-stage"
        transform={`translate(${margin.left}, ${margin.top})`}
      >
        {children}
      </g>

      {/* 4. Optional Calibration & Geometry Inspection Overlay (Excluded from Exports) */}
      {showCalibrationGrid && (
        <g data-export-ignore="true" className="calibration-overlay">
          {/* Outer Margin Shading */}
          <rect
            x={margin.left}
            y={margin.top}
            width={innerWidth}
            height={innerHeight}
            fill="none"
            stroke="#0284C7"
            strokeWidth={1}
            strokeDasharray="4 3"
          />

          {/* Vertical Grid & Ruler Ticks */}
          {xCalibrationTicks.map((tickValue) => (
            <g
              key={`x-cal-${tickValue}`}
              transform={`translate(${margin.left + tickValue}, ${margin.top})`}
            >
              <line
                x1={0}
                y1={0}
                x2={0}
                y2={innerHeight}
                stroke="#0284C7"
                strokeWidth={0.5}
                strokeOpacity={0.22}
              />
              <text
                x={2}
                y={-4}
                fill="#0284C7"
                fontFamily={theme.fontFamilyMono}
                fontSize={8.5}
              >
                {tickValue}px
              </text>
            </g>
          ))}

          {/* Horizontal Grid & Ruler Ticks */}
          {yCalibrationTicks.map((tickValue) => (
            <g
              key={`y-cal-${tickValue}`}
              transform={`translate(${margin.left}, ${margin.top + tickValue})`}
            >
              <line
                x1={0}
                y1={0}
                x2={innerWidth}
                y2={0}
                stroke="#0284C7"
                strokeWidth={0.5}
                strokeOpacity={0.22}
              />
              <text
                x={-6}
                y={3}
                textAnchor="end"
                fill="#0284C7"
                fontFamily={theme.fontFamilyMono}
                fontSize={8.5}
              >
                {tickValue}px
              </text>
            </g>
          ))}

          {/* Corner Coordinate Badge */}
          <g transform={`translate(${width - margin.right - 155}, ${margin.top + 8})`}>
            <rect
              x={0}
              y={0}
              width={147}
              height={20}
              rx={3}
              fill="#0284C7"
              fillOpacity={0.12}
              stroke="#0284C7"
              strokeWidth={0.75}
            />
            <text
              x={8}
              y={13}
              fill="#0284C7"
              fontFamily={theme.fontFamilyMono}
              fontSize={9.5}
              fontWeight={600}
            >
              PLOT: {innerWidth} × {innerHeight}px
            </text>
          </g>
        </g>
      )}

      {/* 5. Footer Block: Source Attribution, Methodological Footnotes, and Credit */}
      <g className="figure-footer">
        <line
          x1={margin.left}
          y1={footerBaselineY - 24}
          x2={width - margin.right}
          y2={footerBaselineY - 24}
          stroke={theme.gridline}
          strokeWidth={1}
        />

        {metadata.footnote && (
          <text
            x={margin.left}
            y={footerBaselineY - 11}
            fill={theme.inkMuted}
            fontFamily={theme.fontFamilySans}
            fontSize={10.5}
            fontStyle="italic"
          >
            Note: {metadata.footnote}
          </text>
        )}

        {metadata.source && (
          <text
            x={margin.left}
            y={footerBaselineY + 3}
            fill={theme.inkSecondary}
            fontFamily={theme.fontFamilySans}
            fontSize={10.5}
            fontWeight={500}
          >
            Source: {metadata.source}
          </text>
        )}

        {metadata.credit && (
          <text
            x={width - margin.right}
            y={footerBaselineY + 3}
            textAnchor="end"
            fill={theme.inkMuted}
            fontFamily={theme.fontFamilyMono}
            fontSize={10}
          >
            {metadata.credit}
          </text>
        )}
      </g>
    </svg>
  );
};
