//
// Copyright 2026 DXOS.org
//

import React, { useId, useMemo } from 'react';

import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type Ir, Layout, Palette } from '#model';

/**
 * Renders an Archify architecture IR as SVG.
 *
 * Pure and deterministic: geometry comes from `Layout.resolve`, colour from the palette, and the
 * only inputs beyond the IR are the reader's focus set and the theme. Nothing here reads or writes
 * ECHO, so the same component serves the article, card, section and slide surfaces.
 */
export type ArchifySvgProps = ThemedClassName<{
  diagram: Ir.Architecture;
  /** Component ids to keep at full strength; everything else recedes. Empty means "all". */
  focus?: ReadonlySet<string>;
  /** Component the reader has picked out, drawn with a halo. */
  selected?: string;
  onSelect?: (id: string | undefined) => void;
  /** Hide the type legend (cards and boundaries already carry it in dense embeds). */
  hideLegend?: boolean;
}>;

const DIM_OPACITY = 0.22;

const arrowMarker = (id: string, color: string) => (
  <marker
    key={id}
    id={id}
    viewBox='0 0 10 10'
    refX='9'
    refY='5'
    markerWidth='7'
    markerHeight='7'
    orient='auto-start-reverse'
  >
    <path d='M 0 1 L 9 5 L 0 9 z' fill={color} />
  </marker>
);

export const ArchifySvg = ({ classNames, diagram, focus, selected, onSelect, hideLegend }: ArchifySvgProps) => {
  const { themeMode } = useThemeContext();
  const palette = useMemo(() => Palette.paletteFor(themeMode === 'dark' ? 'dark' : 'light'), [themeMode]);
  const resolved = useMemo(() => Layout.resolve(diagram), [diagram]);
  // Markers are referenced by fragment id, and several diagrams may share one page.
  const prefix = useId().replace(/:/g, '');

  const dimmed = (id: string) => !!focus && focus.size > 0 && !focus.has(id);
  const toggle = (id: string) => onSelect?.(id === selected ? undefined : id);
  const variants: Ir.Variant[] = ['default', 'emphasis', 'security', 'dashed'];

  return (
    <svg
      // Selectable components are focusable buttons, so the SVG is a group rather than one image.
      role={onSelect ? 'group' : 'img'}
      aria-label={diagram.meta.title}
      viewBox={resolved.viewBox}
      preserveAspectRatio='xMidYMid meet'
      className={mx('dx-fill', classNames)}
      onClick={() => onSelect?.(undefined)}
    >
      <title>{diagram.meta.title}</title>
      <defs>
        {variants.map((variant) =>
          arrowMarker(`${prefix}-arrow-${variant}`, Palette.connectionStyle(palette, variant).stroke),
        )}
      </defs>

      {resolved.boundaries.map((boundary, index) => (
        <g key={`${boundary.label}-${index}`} opacity={boundary.wraps.every(dimmed) ? DIM_OPACITY : 1}>
          <rect
            x={boundary.x}
            y={boundary.y}
            width={boundary.width}
            height={boundary.height}
            rx={12}
            fill={palette.lane.fill}
            stroke={palette.lane.stroke}
            strokeWidth={1}
            strokeDasharray={boundary.kind === 'security-group' ? '5 4' : undefined}
          />
          <text
            x={boundary.x + 12}
            y={boundary.y + Layout.DEFAULTS.boundaryLabelBaseline}
            fontSize={10}
            fill={palette.textDim}
            letterSpacing={0.4}
          >
            {boundary.label}
          </text>
        </g>
      ))}

      {resolved.connections.map(({ key, connection, path, label }) => {
        const style = Palette.connectionStyle(palette, connection.variant, connection.width);
        const faded = dimmed(connection.from) || dimmed(connection.to);
        return (
          <g key={key} opacity={faded ? DIM_OPACITY : 1}>
            <path
              d={path}
              fill='none'
              stroke={style.stroke}
              strokeWidth={style.width}
              strokeDasharray={style.dash}
              strokeLinecap='round'
              strokeLinejoin='round'
              markerEnd={`url(#${prefix}-arrow-${connection.variant ?? 'default'})`}
            />
            {label && (
              <text
                x={label.at[0]}
                y={label.at[1]}
                textAnchor='middle'
                fontSize={9}
                fill={Palette.labelColor(palette, connection.variant)}
              >
                {label.text}
              </text>
            )}
          </g>
        );
      })}

      {resolved.components
        .filter((component) => Number.isFinite(component.x))
        .map((component) => {
          const swatch = palette.component[component.type];
          const faded = dimmed(component.id);
          const hasSublabel = !!component.sublabel;
          return (
            <g
              key={component.id}
              opacity={faded ? DIM_OPACITY : 1}
              className={onSelect ? 'cursor-pointer' : undefined}
              role={onSelect ? 'button' : undefined}
              tabIndex={onSelect ? 0 : undefined}
              aria-pressed={onSelect ? component.id === selected : undefined}
              aria-label={onSelect ? [component.label, component.sublabel].filter(Boolean).join(' — ') : undefined}
              onClick={(event) => {
                event.stopPropagation();
                toggle(component.id);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  event.stopPropagation();
                  toggle(component.id);
                }
              }}
            >
              {/* Opaque plate: component fills are translucent, so a route underneath would
                  otherwise read as passing through the box. */}
              <rect
                x={component.x}
                y={component.y}
                width={component.width}
                height={component.height}
                rx={8}
                fill={palette.mask}
              />
              <rect
                x={component.x}
                y={component.y}
                width={component.width}
                height={component.height}
                rx={8}
                fill={swatch.fill}
                stroke={swatch.stroke}
                strokeWidth={component.id === selected ? 2.5 : 1.5}
              />
              <text
                x={component.cx}
                y={hasSublabel ? component.cy - 4 : component.cy}
                textAnchor='middle'
                dominantBaseline='central'
                fontSize={11}
                fontWeight={600}
                fill={palette.text}
              >
                {component.label}
              </text>
              {component.sublabel && (
                <text
                  x={component.cx}
                  y={component.cy + 10}
                  textAnchor='middle'
                  dominantBaseline='central'
                  fontSize={8}
                  fill={palette.textMuted}
                >
                  {component.sublabel}
                </text>
              )}
              {component.tag && (
                <text
                  x={component.cx}
                  y={component.y - 5}
                  textAnchor='middle'
                  fontSize={7}
                  fill={swatch.stroke}
                  letterSpacing={0.3}
                >
                  {component.tag}
                </text>
              )}
            </g>
          );
        })}

      {!hideLegend && diagram.meta.legend?.mode !== 'hidden' && resolved.usedTypes.length > 1 && (
        <g>
          {resolved.usedTypes.map((type, index) => {
            const [minX, minY, , height] = resolved.viewBox.split(' ').map(Number);
            const x = minX + 16 + index * 92;
            const y = minY + height - 22;
            return (
              <g key={type}>
                <rect
                  x={x}
                  y={y}
                  width={14}
                  height={9}
                  rx={2}
                  fill={palette.component[type].fill}
                  stroke={palette.component[type].stroke}
                  strokeWidth={1}
                />
                <text x={x + 20} y={y + 8} fontSize={8} fill={palette.textDim}>
                  {Palette.LEGEND_LABELS[type]}
                </text>
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
};
