//
// Copyright 2025 DXOS.org
//

import { batch } from '@preact/signals-core';
import { pipe } from 'effect';

import {
  chain,
  createIntent,
  createResolver,
  LayoutAction,
  type LayoutEntry,
  type LayoutPart,
  NavigationAction,
  openIds,
  SLUG_PATH_SEPARATOR,
} from '@dxos/app-framework';
import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework/next';
import { isReactiveObject, getTypename } from '@dxos/live-object';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { ObservabilityAction } from '@dxos/plugin-observability/types';

import { setLocation } from './set-location';
import { closeEntry, incrementPlank, openEntry } from '../../layout';
import { DECK_PLUGIN } from '../../meta';
import { type DeckSettingsProps } from '../../types';
import { getEffectivePart } from '../../util';

// TODO(wittjosiah): Factor out navgiation from deck plugin.
export default (context: PluginsContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver(NavigationAction.Open, (data) => {
      const [{ settings }] = context.requestCapability(
        Capabilities.Settings,
        (c): c is { plugin: typeof DECK_PLUGIN; settings: DeckSettingsProps } => c.plugin === DECK_PLUGIN,
      );
      const [location] = context.requestCapability(Capabilities.MutableLocation);
      const [layout] = context.requestCapability(Capabilities.MutableLayout);
      const [{ graph }] = context.requestCapability(Capabilities.AppGraph);
      const [attention] = context.requestCapability(AttentionCapabilities.Attention);

      const previouslyOpenIds = new Set<string>(openIds(location.active));
      const layoutMode = layout.layoutMode;
      const toAttend = batch(() => {
        const processLayoutEntry = (partName: string, entryString: string, currentLayout: any) => {
          // TODO(burdon): Option to toggle?
          const toggle = false;
          const [id, path] = entryString.split(SLUG_PATH_SEPARATOR);
          const layoutEntry: LayoutEntry = { id, ...(path ? { path } : {}) };
          const effectivePart = getEffectivePart(partName as LayoutPart, layoutMode);
          if (
            toggle &&
            layoutMode === 'deck' &&
            effectivePart === 'main' &&
            currentLayout[effectivePart]?.some((entry: LayoutEntry) => entry.id === id) &&
            !data?.noToggle
          ) {
            // If we're in deck mode and the main part is already open, toggle it closed.
            return closeEntry(currentLayout, { part: effectivePart as LayoutPart, entryId: id });
          } else {
            return openEntry(currentLayout, effectivePart, layoutEntry, {
              positioning: settings.newPlankPositioning,
            });
          }
        };

        let newLayout = location.active;
        Object.entries(data.activeParts).forEach(([partName, layoutEntries]) => {
          if (Array.isArray(layoutEntries)) {
            layoutEntries.forEach((activePartEntry: string) => {
              newLayout = processLayoutEntry(partName, activePartEntry, newLayout);
            });
          } else if (typeof layoutEntries === 'string') {
            // Legacy single string entry.
            newLayout = processLayoutEntry(partName, layoutEntries, newLayout);
          }
        });

        return setLocation({ next: newLayout, layout, location, attention });
      });

      const ids = openIds(location.active);
      const newlyOpen = ids.filter((i) => !previouslyOpenIds.has(i));

      return {
        data: { open: ids },
        intents: [
          createIntent(LayoutAction.ScrollIntoView, { id: newlyOpen[0] ?? toAttend }),
          ...(toAttend ? [createIntent(NavigationAction.Expose, { id: toAttend })] : []),
          ...newlyOpen.map((id) => {
            const active = graph?.findNode(id)?.data;
            const typename = isReactiveObject(active) ? getTypename(active) : undefined;
            return createIntent(ObservabilityAction.SendEvent, {
              name: 'navigation.activate',
              properties: {
                id,
                typename,
              },
            });
          }),
        ],
      };
    }),
    createResolver(NavigationAction.AddToActive, (data) => {
      const [{ settings }] = context.requestCapability(
        Capabilities.Settings,
        (c): c is { plugin: typeof DECK_PLUGIN; settings: DeckSettingsProps } => c.plugin === DECK_PLUGIN,
      );
      const [location] = context.requestCapability(Capabilities.MutableLocation);
      const [layout] = context.requestCapability(Capabilities.MutableLayout);
      const [attention] = context.requestCapability(AttentionCapabilities.Attention);

      const layoutEntry = { id: data.id };
      const effectivePart = getEffectivePart(data.part, layout.layoutMode);

      setLocation({
        next: openEntry(location.active, effectivePart, layoutEntry, {
          positioning: data.positioning ?? settings.newPlankPositioning,
          pivotId: data.pivotId,
        }),
        layout,
        location,
        attention,
      });

      const intents = [];
      if (data.scrollIntoView && layout.layoutMode === 'deck') {
        intents.push(createIntent(LayoutAction.ScrollIntoView, { id: data.id }));
      }

      return { intents };
    }),
    createResolver(NavigationAction.Close, (data) => {
      const [location] = context.requestCapability(Capabilities.MutableLocation);
      const [layout] = context.requestCapability(Capabilities.MutableLayout);
      const [attention] = context.requestCapability(AttentionCapabilities.Attention);

      let newLayout = location.active;
      const layoutMode = layout.layoutMode;
      const intentParts = data.activeParts;
      Object.keys(intentParts).forEach((partName: string) => {
        const effectivePart = getEffectivePart(partName as LayoutPart, layoutMode);
        const ids = intentParts[partName];
        if (Array.isArray(ids)) {
          ids.forEach((id: string) => {
            newLayout = closeEntry(newLayout, { part: effectivePart, entryId: id });
          });
        } else {
          // Legacy single string entry
          newLayout = closeEntry(newLayout, { part: effectivePart, entryId: ids });
        }
      });

      const toAttend = setLocation({ next: newLayout, layout, location, attention });
      return { intents: [createIntent(LayoutAction.ScrollIntoView, { id: toAttend })] };
    }),
    createResolver(NavigationAction.Set, (data) => {
      const [layout] = context.requestCapability(Capabilities.MutableLayout);
      const [location] = context.requestCapability(Capabilities.MutableLocation);
      const [attention] = context.requestCapability(AttentionCapabilities.Attention);

      return batch(() => {
        const toAttend = setLocation({ next: data.activeParts, layout, location, attention });
        return { intents: [createIntent(LayoutAction.ScrollIntoView, { id: toAttend })] };
      });
    }),
    createResolver(NavigationAction.Adjust, (adjustment) => {
      const [location] = context.requestCapability(Capabilities.MutableLocation);
      const [layout] = context.requestCapability(Capabilities.MutableLayout);
      const [attention] = context.requestCapability(AttentionCapabilities.Attention);

      return batch(() => {
        if (adjustment.type === 'increment-end' || adjustment.type === 'increment-start') {
          setLocation({
            next: incrementPlank(location.active, {
              type: adjustment.type,
              layoutCoordinate: adjustment.layoutCoordinate,
            }),
            layout,
            location,
            attention,
          });
        }

        if (adjustment.type === 'solo') {
          const entryId = adjustment.layoutCoordinate.entryId;
          if (layout.layoutMode !== 'solo') {
            // Solo the entry.
            return {
              intents: [
                // NOTE: The order of these is important.
                pipe(
                  createIntent(NavigationAction.Open, { activeParts: { solo: [entryId] } }),
                  chain(LayoutAction.SetLayoutMode, { layoutMode: 'solo' }),
                ),
              ],
            };
          } else {
            // Un-solo the current entry.
            return {
              intents: [
                // NOTE: The order of these is important.
                pipe(
                  createIntent(LayoutAction.SetLayoutMode, { layoutMode: 'deck' }),
                  chain(NavigationAction.Close, { activeParts: { solo: [entryId] } }),
                  chain(NavigationAction.Open, { activeParts: { main: [entryId] }, noToggle: true }),
                  chain(LayoutAction.ScrollIntoView, { id: entryId }),
                ),
              ],
            };
          }
        }
      });
    }),
  ]);
