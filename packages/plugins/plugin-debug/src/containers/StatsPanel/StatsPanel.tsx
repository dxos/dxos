//
// Copyright 2026 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';
import React from 'react';

import { useOptionalCapability } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { ScrollArea } from '@dxos/react-ui';

// Fallback so the atom hook is called unconditionally when no store is contributed (host plugin not
// loaded); the panel then renders its empty state.
const EMPTY = Atom.make<Record<string, unknown>>({});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Renders a leaf value; numbers are monospace so columns of counts align. */
const formatValue = (value: unknown): string => (typeof value === 'number' ? value.toLocaleString() : String(value));

/**
 * Flattens a compartment into `key → value` rows, one level deep: nested objects (e.g. `coverage`)
 * become dotted keys (`coverage.plain`) so everything renders in a single flat table.
 */
const flatten = (stats: unknown): [string, unknown][] => {
  if (!isRecord(stats)) {
    return [['value', stats]];
  }

  return Object.entries(stats).flatMap(([key, value]) =>
    isRecord(value)
      ? Object.entries(value).map(([subKey, subValue]): [string, unknown] => [`${key}.${subKey}`, subValue])
      : [[key, value] as [string, unknown]],
  );
};

/**
 * Presentational panel for the {@link AppCapabilities.StatsPanel} store: renders every plugin
 * compartment as a flat key × value table, live (re-renders on each write). Purely generic — it
 * displays whatever each plugin stores, so it works for sync telemetry or any other stats.
 */
export const StatsPanel = () => {
  const store = useOptionalCapability(AppCapabilities.StatsPanel);
  const stats = useAtomValue(store?.statsAtom ?? EMPTY);
  const compartments = Object.entries(stats);
  if (compartments.length === 0) {
    return <div className='p-2 text-sm text-description'>No stats yet.</div>;
  }

  return (
    <ScrollArea.Root thin centered padding>
      <ScrollArea.Viewport>
        {compartments.map(([pluginKey, value]) => (
          <table key={pluginKey} className='w-full border-collapse'>
            <caption className='text-start font-mono text-xs text-description pbe-1'>{pluginKey}</caption>
            <tbody>
              {flatten(value).map(([key, cell]) => (
                <tr key={key} className='border-be border-separator'>
                  <td className='pbe-1 pbs-1 pie-2 text-description align-top'>{key}</td>
                  <td className='pbe-1 pbs-1 font-mono text-end'>{formatValue(cell)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};

StatsPanel.displayName = 'StatsPanel';
