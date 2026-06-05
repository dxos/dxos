//
// Copyright 2026 DXOS.org
//

import { type Atom, useAtomSet } from '@effect-atom/atom-react';
import React from 'react';

import { AtomObj } from '@dxos/echo-atom';
import { Panel } from '@dxos/react-ui';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { meta } from '#meta';
import { type Magazine } from '#types';

import { type MagazineView } from '#atoms';

export type MagazineToolbarProps = {
  magazine: Magazine.Magazine;
  /** Current view filter; the toolbar both reads (for the active toggle) and writes it. */
  viewAtom: Atom.Writable<MagazineView, MagazineView>;
  /** Whether a curate run is in flight. */
  busyAtom: Atom.Atom<boolean>;
  attendableId?: string;
  onClear: () => void;
  onCurate: () => void;
};

/**
 * Reactive magazine toolbar built from the menu action-graph idiom. The action graph reads all of its
 * state — the view filter, the curate-busy flag, and whether the magazine has feeds — via `get`
 * inside the builder, so it subscribes to those atoms and rebuilds itself whenever they change.
 * Deps hold only stable references (atoms + callbacks), never the reactive values.
 */
export const MagazineToolbar = ({ magazine, viewAtom, busyAtom, attendableId, onClear, onCurate }: MagazineToolbarProps) => {
  const setView = useAtomSet(viewAtom);

  const menuActions = useMenuBuilder(
    (get) => {
      const view = get(viewAtom);
      const busy = get(busyAtom);
      const hasFeeds = (get(AtomObj.makeProperty(magazine, 'feeds')) ?? []).length > 0;
      // Curate is disabled while busy or until there is at least one feed; the tooltip explains why.
      const curateLabel = !hasFeeds ? 'no-feeds.label' : busy ? 'refreshing-magazine.label' : 'curate.label';

      return (
        MenuBuilder.make()
          // Single-select filter: `value` is the active child id; `'default'` matches neither, so both
          // toggles read as off. Re-clicking the active toggle returns to `'default'`.
          .group(
            'view',
            {
              label: ['view-filter.label', { ns: meta.id }],
              variant: 'toggleGroup',
              selectCardinality: 'single',
              value: view,
            },
            (group) => {
              group.action(
                'starred',
                {
                  label: ['only-starred.label', { ns: meta.id }],
                  icon: view === 'starred' ? 'ph--star--fill' : 'ph--star--regular',
                },
                () => setView(view === 'starred' ? 'default' : 'starred'),
              );
              group.action(
                'archived',
                { label: ['show-archived.label', { ns: meta.id }], icon: 'ph--archive--regular' },
                () => setView(view === 'archived' ? 'default' : 'archived'),
              );
            },
          )
          // `gap` is a flexible spacer that pushes Clear + Curate to the trailing edge.
          .separator('gap')
          .action(
            'clear',
            {
              label: ['clear-magazine.label', { ns: meta.id }],
              icon: 'ph--trash--regular',
              iconOnly: true,
              disabled: busy,
            },
            onClear,
          )
          .action(
            'curate',
            {
              label: [curateLabel, { ns: meta.id }],
              icon: busy ? 'ph--circle-notch--regular' : 'ph--sparkle--regular',
              iconClassNames: busy ? 'animate-spin' : undefined,
              iconOnly: true,
              disabled: busy || !hasFeeds,
            },
            onCurate,
          )
          .build()
      );
    },
    [magazine, viewAtom, busyAtom, setView, onClear, onCurate],
  );

  return (
    <Menu.Root {...menuActions} attendableId={attendableId}>
      <Panel.Toolbar asChild>
        <Menu.Toolbar />
      </Panel.Toolbar>
    </Menu.Root>
  );
};

MagazineToolbar.displayName = 'MagazineToolbar';
