//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { type TerraConfigValues } from '../../engine';
import { type SimObject, toUnit } from '../../sim';
import { type TerraObject } from '../../types';
import { MAP_HEIGHT, MAP_WIDTH, project, projectPath } from './projection';
import { renderTerrain } from './terrain';
import { useEasedHeadings } from './useEasedHeadings';

/**
 * Brightened relatives of the hues `scene/object-forms.ts` gives each kind in 3D — those materials
 * are tuned for a lit surface and read as near-black against a flat map.
 */
const OBJECT_COLOR: Record<TerraObject.Kind, string> = {
  boat: '#5eb0e5',
  tank: '#b6c455',
  plane: '#e2e8f0',
  rocket: '#ef5350',
  satellite: '#f5b731',
};

/** Degrees between graticule lines; the equator and the prime meridian are drawn heavier so they stand out. */
const GRATICULE_STEP = 30;

const graticule = (): { meridians: number[]; parallels: number[] } => ({
  meridians: Array.from({ length: MAP_WIDTH / GRATICULE_STEP + 1 }, (_, index) => index * GRATICULE_STEP),
  parallels: Array.from({ length: MAP_HEIGHT / GRATICULE_STEP + 1 }, (_, index) => index * GRATICULE_STEP),
});

export type TerraMapProps = {
  objects: readonly SimObject[];
  config: TerraConfigValues;
  /** `TerraObject.id` of the highlighted object, if any. */
  selectedId?: string;
  onSelect?: (id: string | undefined) => void;
  /** Draws the seed's land and sea behind the grid; without it a surface route has no context. */
  terrain?: boolean;
};

/**
 * Objects seen from above on an equirectangular grid: each one's planned route, where the current
 * leg started and where it ends, and the object itself pointing along its course. A companion to
 * the 3D view — everything is visible at once, and a click selects.
 */
export const TerraMap = ({ objects, config, selectedId, onSelect, terrain = true }: TerraMapProps) => {
  const backdrop = useMemo(() => (terrain ? renderTerrain(config) : undefined), [terrain, config]);
  const { meridians, parallels } = useMemo(() => graticule(), []);
  const headings = useEasedHeadings(objects);

  return (
    <svg
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      preserveAspectRatio='xMidYMid meet'
      className='w-full h-full text-description'
      data-testid='terra.map'
    >
      {/* Catches clicks outside any object, which clear the selection. */}
      <rect
        x={0}
        y={0}
        width={MAP_WIDTH}
        height={MAP_HEIGHT}
        fill='transparent'
        onClick={() => onSelect?.(undefined)}
      />
      {backdrop && <image href={backdrop} x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} opacity={0.85} />}

      <g stroke='currentColor' fill='none' opacity={0.35}>
        {meridians.map((x) => (
          <line
            key={`meridian-${x}`}
            x1={x}
            y1={0}
            x2={x}
            y2={MAP_HEIGHT}
            strokeWidth={x === MAP_WIDTH / 2 ? 0.5 : 0.2}
          />
        ))}
        {parallels.map((y) => (
          <line
            key={`parallel-${y}`}
            x1={0}
            y1={y}
            x2={MAP_WIDTH}
            y2={y}
            strokeWidth={y === MAP_HEIGHT / 2 ? 0.5 : 0.2}
          />
        ))}
      </g>

      {objects.map((object) => (
        <ObjectTrack
          key={object.definition.id}
          object={object}
          heading={headings.get(object.definition.id) ?? object.state.bearing}
          selected={object.definition.id === selectedId}
          onSelect={onSelect}
        />
      ))}

      <g fill='currentColor' fontSize={4} opacity={0.6}>
        {meridians.slice(0, -1).map((x) => (
          <text key={`meridian-label-${x}`} x={x + 1} y={MAP_HEIGHT - 1.5}>
            {`${x - 180}°`}
          </text>
        ))}
        {parallels.slice(1, -1).map((y) => (
          <text key={`parallel-label-${y}`} x={1} y={y - 1.5}>
            {`${90 - y}°`}
          </text>
        ))}
      </g>
    </svg>
  );
};

TerraMap.displayName = 'TerraMap';

type ObjectTrackProps = {
  object: SimObject;
  /** Rendered facing, eased toward `state.bearing` — see `useEasedHeadings`. */
  heading: number;
  selected: boolean;
  onSelect?: (id: string | undefined) => void;
};

/** One object: its route, the current leg's origin and destination, and the object itself. */
const ObjectTrack = ({ object: { definition, state }, heading, selected, onSelect }: ObjectTrackProps) => {
  const color = OBJECT_COLOR[definition.kind];
  const route = useMemo(() => projectPath(state.route), [state.route]);
  const position = project(state.unit);
  // The leg's own endpoints rather than the definition's placed source/target, which only describe
  // leg 0 — every later destination is derived, never stored.
  const origin = state.route.length > 0 ? project(state.route[0]) : undefined;
  // Closed-form kinds (rocket, satellite) have no route, so their destination is the placed one.
  const destination =
    state.route.length > 1
      ? project(state.route[state.route.length - 1])
      : definition.target
        ? project(toUnit(definition.target))
        : undefined;

  return (
    <g stroke={color} fill={color} data-testid='terra.map.object' data-kind={definition.kind} data-selected={selected}>
      <g fill='none' opacity={selected ? 0.9 : 0.4} strokeWidth={selected ? 0.6 : 0.35}>
        {route.map((points, index) => (
          <polyline key={index} points={points} strokeDasharray='2 1.5' />
        ))}
      </g>
      {origin && <circle cx={origin.x} cy={origin.y} r={1.2} fill='none' strokeWidth={0.4} opacity={0.8} />}
      {destination && (
        <g strokeWidth={0.5} opacity={0.9}>
          <line x1={destination.x - 1.6} y1={destination.y - 1.6} x2={destination.x + 1.6} y2={destination.y + 1.6} />
          <line x1={destination.x - 1.6} y1={destination.y + 1.6} x2={destination.x + 1.6} y2={destination.y - 1.6} />
        </g>
      )}

      <g transform={`translate(${position.x} ${position.y}) rotate(${heading})`}>
        {selected && <circle cx={0} cy={0} r={4} fill='none' strokeWidth={0.4} />}
        <polygon points='0,-2.6 1.8,2.2 0,1.2 -1.8,2.2' strokeWidth={0.3} />
      </g>
      <circle
        cx={position.x}
        cy={position.y}
        r={5}
        fill='transparent'
        stroke='none'
        className='cursor-pointer'
        onClick={() => onSelect?.(definition.id)}
      >
        <title>{definition.name ?? definition.kind}</title>
      </circle>
    </g>
  );
};
