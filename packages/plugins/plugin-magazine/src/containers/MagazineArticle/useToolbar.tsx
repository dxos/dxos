//
// Copyright 2026 DXOS.org
//

import { useAtomSet } from '@effect/atom-react/Hooks';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { useCallback, useContext, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Obj, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { type MagazineView } from '#atoms';
import { meta } from '#meta';
import { FeedOperation, Magazine, Subscription } from '#types';

import { FEED_DIALOG } from '../../constants';

export type UseToolbarProps = {
  magazine: Magazine.Magazine;
};

/**
 * Owns the magazine toolbar: the view-filter and curate-busy atoms, the Curate/Clear operation
 * handlers, and the reactive menu action graph. The action graph reads its state — view filter,
 * curate-busy flag, and whether the magazine has feeds — via `get` inside the builder, so it
 * subscribes to those atoms and rebuilds whenever they change. Returns the menu props (spread into
 * `Menu.Root`) plus `viewAtom`, which the article also reads to filter the visible posts.
 */
export const useToolbar = ({ magazine }: UseToolbarProps) => {
  const invoker = useOperationInvoker();
  const registry = useContext(RegistryContext);
  const db = Obj.getDatabase(magazine);
  const viewAtom = useMemo(() => Atom.make<MagazineView>('default'), []);
  const busyAtom = useMemo(() => Atom.make(false), []);
  const setView = useAtomSet(viewAtom);

  // Curate and Clear share the busy guard: ignore re-entry while a run is in flight, flip the busy flag
  // for the duration, then run the supplied invocation (failures surface via its own notify config).
  const runExclusive = useCallback(
    <A, E>(effect: Effect.Effect<A, E>) => {
      if (registry.get(busyAtom)) {
        return;
      }
      registry.set(busyAtom, true);
      void EffectEx.runAndForwardErrors(effect.pipe(Effect.ensuring(Effect.sync(() => registry.set(busyAtom, false)))));
    },
    [registry, busyAtom],
  );

  const handleCurate = useCallback(
    () =>
      runExclusive(
        invoker.invoke(
          FeedOperation.CurateMagazine,
          { magazine: Ref.make(magazine) },
          { spaceId: db?.spaceId, notify: { error: ['curate-error.message', { ns: meta.profile.key }] } },
        ),
      ),
    [runExclusive, invoker, magazine, db],
  );

  // The feed is created and attached up front so the dialog's form edits a live object; cancelling the
  // dialog takes it back out (see `FeedDialog`), which is what keeps the create atomic from the reader's
  // point of view without a separate draft representation.
  const handleAddFeed = useCallback(() => {
    if (!db) {
      return;
    }

    const feed = db.add(Subscription.makeSubscription({ type: 'rss' }));
    Obj.update(magazine, (magazine) => {
      magazine.feeds = [...magazine.feeds, Ref.make(feed)];
    });
    void invoker.invokePromise(LayoutOperation.UpdateDialog, {
      subject: FEED_DIALOG,
      props: { feed, magazine },
    });
  }, [db, magazine, invoker]);

  const handleClear = useCallback(
    () =>
      runExclusive(
        invoker.invoke(
          FeedOperation.ClearMagazine,
          { magazine: Ref.make(magazine) },
          { spaceId: db?.spaceId, notify: { error: ['clear-error.message', { ns: meta.profile.key }] } },
        ),
      ),
    [runExclusive, invoker, magazine, db],
  );

  const menu = useMenuBuilder(
    (get) => {
      const view = get(viewAtom);
      const busy = get(busyAtom);
      const hasFeeds = (get(Obj.atomProperty(magazine, 'feeds')) ?? []).length > 0;
      // Curate runs the magazine's Routine, so it is unavailable until that Routine exists.
      const hasRoutine = Boolean(get(Obj.atomProperty(magazine, 'instructions')));
      // Curate is disabled while busy or until there is at least one feed; the tooltip explains why.
      const curateLabel = !hasFeeds ? 'no-feeds.label' : busy ? 'refreshing-magazine.label' : 'curate.label';

      return (
        MenuBuilder.make()
          .action(
            'add-feed',
            {
              label: ['add-feed.label', { ns: meta.profile.key }],
              icon: 'ph--plus--regular',
            },
            handleAddFeed,
          )
          // Single-select filter: `value` is the active child id; `'default'` matches neither, so both
          // toggles read as off. Re-clicking the active toggle returns to `'default'`.
          .group(
            'view',
            {
              label: ['view-filter.label', { ns: meta.profile.key }],
              variant: 'toggleGroup',
              selectCardinality: 'single',
              value: view,
            },
            (group) => {
              group.action(
                'starred',
                {
                  label: ['only-starred.label', { ns: meta.profile.key }],
                  icon: view === 'starred' ? 'ph--star--fill' : 'ph--star--regular',
                },
                () => setView(view === 'starred' ? 'default' : 'starred'),
              );
              group.action(
                'archived',
                {
                  label: ['show-archived.label', { ns: meta.profile.key }],
                  icon: 'ph--archive--regular',
                },
                () => setView(view === 'archived' ? 'default' : 'archived'),
              );
            },
          )
          .separator('gap')
          .action(
            'clear',
            {
              label: ['clear-magazine.label', { ns: meta.profile.key }],
              icon: 'ph--broom--regular',
              iconOnly: true,
              disabled: busy,
            },
            handleClear,
          )
          .action(
            'curate',
            {
              label: [curateLabel, { ns: meta.profile.key }],
              icon: busy ? 'ph--circle-notch--regular' : 'ph--sparkle--regular',
              iconClassNames: busy ? 'animate-spin' : undefined,
              iconOnly: true,
              disabled: busy || !hasFeeds || !hasRoutine,
            },
            handleCurate,
          )
          .build()
      );
    },
    [magazine, viewAtom, busyAtom, setView, handleAddFeed, handleClear, handleCurate],
  );

  return { menu, viewAtom };
};

useToolbar.displayName = 'useToolbar';
