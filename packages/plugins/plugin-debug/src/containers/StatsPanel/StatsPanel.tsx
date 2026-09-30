//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React from 'react';

import { useOptionalCapability } from '@dxos/app-framework/ui';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { STAT_CARD_HUES, StatCard } from '@dxos/devtools';
import { Flex } from '@dxos/react-ui';

// Fallback so the atom hook is called unconditionally when no store is contributed (host plugin not
// loaded); the panel then renders its empty state.
const EMPTY = Atom.make<Record<string, unknown>>({});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Renders a leaf value; numbers are localised so columns of counts read alike. */
const formatValue = (value: unknown): string => (typeof value === 'number' ? value.toLocaleString() : String(value));

/**
 * Flattens a compartment into `key → value` rows, one level deep: nested objects (e.g. `coverage`)
 * become dotted keys (`coverage.plain`) so everything renders as flat rows.
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

export type StatsPanelProps = {
  /** Renders the empty state as a card too, so a stack shows the store exists. */
  showEmpty?: boolean;
};

/**
 * The {@link AppCapabilities.StatsPanel} store as one card per plugin compartment, live (re-renders
 * on each write). Purely generic — it displays whatever each plugin stores.
 */
export const StatsPanel = ({ showEmpty = true }: StatsPanelProps) => {
  const store = useOptionalCapability(AppCapabilities.StatsPanel);
  const stats = useAtomValue(store?.statsAtom ?? EMPTY);
  const compartments = Object.entries(stats);
  if (compartments.length === 0) {
    return showEmpty ? (
      <StatCard.Root>
        <StatCard.Header icon='ph--chart-bar--regular' hue={STAT_CARD_HUES.system} title='Plugin stats' />
        <StatCard.Row label='No stats yet.' />
      </StatCard.Root>
    ) : null;
  }

  return (
    <Flex column gap='sm'>
      {compartments.map(([pluginKey, value]) => (
        <StatCard.Root key={pluginKey}>
          <StatCard.Header icon='ph--chart-bar--regular' hue={STAT_CARD_HUES.system} title={pluginKey} />
          {flatten(value).map(([key, cell]) => (
            <StatCard.Row key={key} label={key} tooltip={key} value={formatValue(cell)} />
          ))}
        </StatCard.Root>
      ))}
    </Flex>
  );
};

StatsPanel.displayName = 'StatsPanel';
