//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { ScrollArea } from '@dxos/react-ui';

import type * as TerraObject from '../../types/TerraObject';

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
  /** Great-circle arc travelled per second, in degrees — `TerraObject.speed` (radians/sim-second) converted to a more legible unit. */
  speedDegPerSec: number;
};

export type TelemetryPanelProps = {
  rows: readonly TelemetryRow[];
};

const formatDegrees = (value: number): string => `${value.toFixed(1)}°`;

/**
 * Live per-object telemetry (lat/lng, height, heading, speed), one row per simulated object.
 * Mirrors `TerraForm`'s floating panel chrome (semi-transparent surface, theme tokens) so the two
 * overlays read as a pair. The caller (`TerraArticle`) samples the running sim at a modest rate and
 * passes the result in as `rows`; this component only re-renders when that array changes, never on
 * every sim frame.
 */
export const TelemetryPanel = ({ rows }: TelemetryPanelProps) => (
  <div className='flex flex-col w-fit max-h-72 bg-base-surface/70 backdrop-blur-sm rounded-md shadow-md border border-separator overflow-hidden'>
    <div className='px-3 pt-3 pb-2 text-sm font-medium'>Telemetry</div>
    <ScrollArea.Root orientation='vertical' classNames='max-h-64'>
      <ScrollArea.Viewport>
        <table className='w-full text-xs tabular-nums'>
          <thead>
            <tr className='text-left text-description'>
              <th className='px-3 pb-1 font-normal'>Object</th>
              <th className='px-3 pb-1 font-normal'>Type</th>
              <th className='px-2 pb-1 font-normal text-right'>Lat</th>
              <th className='px-2 pb-1 font-normal text-right'>Lng</th>
              <th className='px-2 pb-1 font-normal text-right'>Height</th>
              <th className='px-2 pb-1 font-normal text-right'>Heading</th>
              <th className='px-3 pb-1 font-normal text-right'>Speed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className='border-t border-separator'>
                <td className='px-3 py-1 max-w-24 truncate'>{row.name}</td>
                <td className='px-3 py-1 max-w-24 truncate'>{row.kind}</td>
                <td className='px-2 py-1 text-right'>{formatDegrees(row.lat)}</td>
                <td className='px-2 py-1 text-right'>{formatDegrees(row.lng)}</td>
                <td className='px-2 py-1 text-right'>{row.heightPercent.toFixed(1)}%</td>
                <td className='px-2 py-1 text-right'>{formatDegrees(row.heading)}</td>
                <td className='px-3 py-1 text-right'>{row.speedDegPerSec.toFixed(2)}°/s</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  </div>
);

TelemetryPanel.displayName = 'TelemetryPanel';
