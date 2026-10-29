//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Listbox } from '@dxos/react-ui-list';
import * as Layout from '@dxos/react-ui/Layout';

import { TerraObject } from '#types';

/**
 * One object's telemetry at the panel's sampling instant. Plain data rather than `SimObject`, so
 * this component has no dependency on the sim/scene layers and the caller controls how often a new
 * `rows` array is produced.
 */
export type TelemetryRow = {
  id: string;
  kind: TerraObject.Kind;
  name: string;
  /** Degrees. */
  lat: number;
  /** Degrees. */
  lng: number;
  /** Altitude above the sea surface, as a percentage of the sea radius (0 for surface craft). */
  heightPercent: number;
  /** Course over ground, degrees [0, 360). */
  heading: number;
  /** Great-circle arc travelled per second, in degrees - `TerraObject.speed` (radians/sim-second) converted to a more legible unit. */
  speedDegPerSec: number;
};

export type TelemetryPanelProps = {
  rows: readonly TelemetryRow[];
  /** `TelemetryRow.id` of the highlighted row; rows are only clickable when `onSelect` is given. */
  selectedId?: string;
  onSelect?: (id: string) => void;
};

const formatDegrees = (value: number): string => `${value.toFixed(1)}°`;

/** Name, kind, then five numeric columns; shared by the header and every row so the cells align. */
const COLUMNS = 'minmax(0, 1fr) 3.5rem 3.5rem 4rem 3.5rem 3.5rem 4rem';

/**
 * Live per-object telemetry (lat/lng, height, heading, speed), one row per simulated object.
 * Mirrors `TerraForm`'s floating panel chrome (semi-transparent surface, theme tokens) so the two
 * overlays read as a pair. The caller (`TerraArticle`) samples the running sim at a modest rate and
 * passes the result in as `rows`; this component only re-renders when that array changes, never on
 * every sim frame.
 */
export const TelemetryPanel = ({ rows, selectedId, onSelect }: TelemetryPanelProps) => {
  const items = useMemo(() => rows.map((row) => ({ value: row.id, label: row.name })), [rows]);

  return (
    <Layout.Flex
      column
      classNames='w-[30rem] max-h-72 bg-base-surface/70 backdrop-blur-sm rounded-md shadow-md border border-separator overflow-hidden'
    >
      <div className='px-3 pt-3 pb-2 text-sm font-medium'>Telemetry</div>
      <Listbox.Root
        items={items}
        columns={COLUMNS}
        size='sm'
        value={onSelect ? (selectedId ?? '') : undefined}
        onValueChange={onSelect}
        // Arrow keys move zag's highlight, not its selection; following it makes Up/Down retarget the camera.
        onHighlightChange={onSelect && ((id) => id && id !== selectedId && onSelect(id))}
        classNames='max-h-64 tabular-nums'
      >
        <Listbox.Viewport>
          <Listbox.Content aria-label='Telemetry'>
            <div
              role='presentation'
              className='grid grid-cols-subgrid col-[content] gap-x-2 px-2 text-xs text-fg-muted [&>*:nth-child(n+3)]:text-end'
            >
              <span>Object</span>
              <span>Type</span>
              <span>Lat</span>
              <span>Lng</span>
              <span>Height</span>
              <span>Heading</span>
              <span>Speed</span>
            </div>
            {/* `content-center`: the row's min-height leaves slack below its single auto track. */}
            {rows.map((row) => (
              <Listbox.Item
                key={row.id}
                id={row.id}
                classNames='content-center gap-x-2 px-2 text-xs [&>*:nth-child(n+3)]:text-end'
              >
                <span className='truncate'>{row.name}</span>
                <span className='truncate'>{row.kind}</span>
                <span>{formatDegrees(row.lat)}</span>
                <span>{formatDegrees(row.lng)}</span>
                <span>{row.heightPercent.toFixed(1)}%</span>
                <span>{formatDegrees(row.heading)}</span>
                <span>{row.speedDegPerSec.toFixed(2)}°/s</span>
              </Listbox.Item>
            ))}
          </Listbox.Content>
        </Listbox.Viewport>
      </Listbox.Root>
    </Layout.Flex>
  );
};

TelemetryPanel.displayName = 'TelemetryPanel';
