import type React from 'react';
import type { PublicationTheme } from '../../core/types';

interface SvgDefsProps {
  theme: PublicationTheme;
}

/**
 * Reusable, publication-grade SVG `<defs>` library available to all visual frameworks.
 * Includes precision arrowhead markers, diagonal hatching patterns for uncertainty/missingness,
 * stipple patterns, and subtle elevation filters.
 */
export const SvgDefs: React.FC<SvgDefsProps> = ({ theme }) => {
  return (
    <defs>
      {/* Precision Arrowhead Markers */}
      <marker
        id="marker-arrow-ink"
        viewBox="0 0 10 10"
        refX="7"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill={theme.inkPrimary} />
      </marker>

      <marker
        id="marker-arrow-muted"
        viewBox="0 0 10 10"
        refX="7"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill={theme.inkMuted} />
      </marker>

      <marker
        id="marker-arrow-accent"
        viewBox="0 0 10 10"
        refX="7"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill={theme.accentPrimary} />
      </marker>

      {/* Diagonal Hatching Pattern (45 deg) for baseline / projected / confidence regions */}
      <pattern
        id="pattern-hatch-diagonal"
        width="8"
        height="8"
        patternTransform="rotate(45 0 0)"
        patternUnits="userSpaceOnUse"
      >
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="8"
          stroke={theme.inkMuted}
          strokeWidth="1.25"
          strokeOpacity="0.45"
        />
      </pattern>

      {/* Dense Cross-Hatch Pattern for statistically non-significant / censored zones */}
      <pattern
        id="pattern-crosshatch"
        width="8"
        height="8"
        patternUnits="userSpaceOnUse"
      >
        <path
          d="M 0,0 L 8,8 M 8,0 L 0,8"
          stroke={theme.inkMuted}
          strokeWidth="0.75"
          strokeOpacity="0.35"
        />
      </pattern>

      {/* Fine Stipple Dot Pattern */}
      <pattern
        id="pattern-dots"
        width="6"
        height="6"
        patternUnits="userSpaceOnUse"
      >
        <circle cx="1.5" cy="1.5" r="0.85" fill={theme.inkMuted} fillOpacity="0.4" />
      </pattern>

      {/* Subtle Label Halo Filter (ensures text legibility over gridlines without ugly boxes) */}
      <filter id="filter-text-halo" x="-10%" y="-10%" width="120%" height="120%">
        <feMorphology operator="dilate" radius="2.2" in="SourceAlpha" result="expanded" />
        <feFlood floodColor={theme.background} floodOpacity="0.92" result="bg" />
        <feComposite in="bg" in2="expanded" operator="in" result="halo" />
        <feMerge>
          <feMergeNode in="halo" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
};
