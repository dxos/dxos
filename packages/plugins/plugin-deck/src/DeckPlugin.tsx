//
// Copyright 2023 DXOS.org
//

import { batch } from '@preact/signals-core';
import { pipe } from 'effect';
import { setAutoFreeze } from 'immer';
import React, { type PropsWithChildren } from 'react';

import {
  chain,
  createIntent,
  createResolver,
  createSurface,
  filterPlugins,
  IntentAction,
  type IntentPluginProvides,
  type Layout,
  LayoutAction,
  type LayoutEntry,
  type LayoutMode,
  type LayoutPart,
  type LayoutParts,
  NavigationAction,
  openIds,
  parseGraphPlugin,
  parseIntentPlugin,
  type Plugin,
  type PluginDefinition,
  resolvePlugin,
  SLUG_PATH_SEPARATOR,
  Toast as ToastSchema,
} from '@dxos/app-framework';
import { type UnsubscribeCallback } from '@dxos/async';
import { getTypename, S } from '@dxos/echo-schema';
import { scheduledEffect } from '@dxos/echo-signals/core';
import { create, isReactiveObject } from '@dxos/live-object';
import { LocalStorageStore } from '@dxos/local-storage';
import { log } from '@dxos/log';
import { type AttentionPluginProvides, parseAttentionPlugin } from '@dxos/plugin-attention';
import { createExtension, type Node } from '@dxos/plugin-graph';
import { ObservabilityAction } from '@dxos/plugin-observability/types';
import { translations as stackTranslations } from '@dxos/react-ui-stack';

import { DeckContext, type DeckContextType, DeckLayout, LayoutContext, LayoutSettings, NAV_ID } from './components';
import {
  closeEntry,
  incrementPlank,
  mergeLayoutParts,
  openEntry,
  removePart,
  soloPartToUri,
  uriToSoloPart,
} from './layout';
import meta, { DECK_PLUGIN } from './meta';
import translations from './translations';
import {
  DeckAction,
  type DeckPluginProvides,
  type DeckSettingsProps,
  type NewPlankPositioning,
  type Overscroll,
  type Panel,
  parsePanelPlugin,
} from './types';
import { checkAppScheme, getEffectivePart } from './util';

const isSocket = !!(globalThis as any).__args;

// TODO(mjamesderocher): Can we get this directly from Socket?
const appScheme = 'composer://';

// NOTE(Zan): When producing values with immer, we shouldn't auto-freeze them because
// our signal implementation needs to add some hidden properties to the produced values.
// TODO(Zan): Move this to a more global location if we use immer more broadly.
setAutoFreeze(false);

export const DeckPlugin = ({
  observability,
}: {
  observability?: boolean;
} = {}): PluginDefinition<DeckPluginProvides> => {
  let intentPlugin: Plugin<IntentPluginProvides> | undefined;
  let attentionPlugin: Plugin<AttentionPluginProvides> | undefined;
  const unsubscriptionCallbacks = [] as (UnsubscribeCallback | undefined)[];
  let currentUndoId: string | undefined;
  let handleNavigation: () => Promise<void> | undefined;
  const panels: Panel[] = [];

  const settings = new LocalStorageStore<DeckSettingsProps>('dxos.org/settings/layout', {
    showHints: false,
    customSlots: false,
    flatDeck: false,
    enableNativeRedirect: false,
    disableDeck: false,
    newPlankPositioning: 'start',
    overscroll: 'centering',
  });

  const layout = new LocalStorageStore<Layout>('dxos.org/settings/layout', {
    layoutMode: 'solo',
    sidebarOpen: true,
    complementarySidebarOpen: false,
    dialogContent: null,
    dialogOpen: false,
    dialogBlockAlign: undefined,
    dialogType: undefined,
    popoverContent: null,
    popoverAnchorId: undefined,
    popoverOpen: false,
    toasts: [],
  });

  const deck = new LocalStorageStore<DeckContextType>('dxos.org/settings/deck', {
    plankSizing: {},
  });

  // TODO(wittjosiah): This active state is not a generic navigation state but quite deck specific.
  //   It is also closely tied to the layout mode state (which also seems quite deck specific).
  //   The layout and navigation interfaces need to be revisited and cleaned up.
  //   Doing this cleanup should also help simplify some of the convoluted logic for managing it.
  const location = new LocalStorageStore<{ active: LayoutParts; closed: string[] }>('dxos.org/state/layout', {
    active: { sidebar: [{ id: NAV_ID }] },
    closed: [],
  });

  // TODO(Zan): Cap depth!
  const layoutModeHistory = create({ values: [] as LayoutMode[] });

  const handleSetLayout = ({
    element,
    state,
    component,
    subject,
    anchorId,
    dialogBlockAlign,
    dialogType,
  }: LayoutAction.SetLayout['input']) => {
    switch (element) {
      case 'sidebar': {
        layout.values.sidebarOpen = state ?? !layout.values.sidebarOpen;
        break;
      }

      case 'complementary': {
        layout.values.complementarySidebarOpen = !!state;
        // TODO(thure): Hoist content into the c11y sidebar of Deck.
        // layout.values.complementarySidebarContent = component || subject ? { component, subject } : null;
        break;
      }

      case 'dialog': {
        layout.values.dialogOpen = state ?? Boolean(component);
        layout.values.dialogContent = component ? { component, subject } : null;
        layout.values.dialogBlockAlign = dialogBlockAlign ?? 'center';
        layout.values.dialogType = dialogType;
        break;
      }

      case 'popover': {
        layout.values.popoverOpen = state ?? Boolean(component);
        layout.values.popoverContent = component ? { component, subject } : null;
        layout.values.popoverAnchorId = anchorId;
        break;
      }

      case 'toast': {
        if (S.is(ToastSchema)(subject)) {
          layout.values.toasts = [...layout.values.toasts, subject];
        }
        break;
      }
    }
  };

  /**
   * Update the active state and returns the id of the next attended plank.
   */
  const handleSetLocation = (next: LayoutParts) => {
    const part = layout.values.layoutMode === 'solo' ? 'solo' : 'main';
    const ids = openIds(next, [part]);

    const current = openIds(location.values.active, [part]);
    const removed = current.filter((id) => !ids.includes(id));
    const closed = Array.from(new Set([...location.values.closed.filter((id) => !ids.includes(id)), ...removed]));

    location.values.closed = closed;
    location.values.active = next;

    if (attentionPlugin) {
      const attended = attentionPlugin.provides.attention.attended;
      const [attendedId] = Array.from(attended);
      const isAttendedAvailable = !!attendedId && ids.includes(attendedId);
      if (!isAttendedAvailable) {
        const currentIds = location.values.active[part]?.map(({ id }) => id) ?? [];
        const attendedIndex = currentIds.indexOf(attendedId);
        // If outside of bounds, focus on the first/last plank, otherwise focus on the new plank in the same position.
        const index = attendedIndex === -1 ? 0 : attendedIndex >= ids.length ? ids.length - 1 : attendedIndex;
        return next[part]?.[index].id;
      }
    }
  };

  return {
    meta,
    ready: async ({ plugins }) => {
      attentionPlugin = resolvePlugin(plugins, parseAttentionPlugin);
      intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
      const dispatch = intentPlugin?.provides.intent.dispatchPromise;

      layout
        .prop({ key: 'layoutMode', type: LocalStorageStore.enum<LayoutMode>() })
        .prop({ key: 'sidebarOpen', type: LocalStorageStore.bool() })
        .prop({ key: 'complementarySidebarOpen', type: LocalStorageStore.bool() });

      deck.prop({ key: 'plankSizing', type: LocalStorageStore.json<Record<string, number>>() });

      location
        .prop({ key: 'active', type: LocalStorageStore.json<LayoutParts>() })
        .prop({ key: 'closed', type: LocalStorageStore.json<string[]>() });

      panels.push(
        ...filterPlugins(plugins, parsePanelPlugin).flatMap((plugin) => plugin.provides.complementary.panels),
      );

      settings
        .prop({ key: 'showHints', type: LocalStorageStore.bool() })
        .prop({ key: 'customSlots', type: LocalStorageStore.bool() })
        .prop({ key: 'flatDeck', type: LocalStorageStore.bool() })
        .prop({ key: 'enableNativeRedirect', type: LocalStorageStore.bool() })
        .prop({ key: 'disableDeck', type: LocalStorageStore.bool() }) // Deprecated.
        .prop({ key: 'newPlankPositioning', type: LocalStorageStore.enum<NewPlankPositioning>() })
        .prop({ key: 'overscroll', type: LocalStorageStore.enum<Overscroll>() });

      if (!isSocket && settings.values.enableNativeRedirect) {
        checkAppScheme(appScheme);
      }

      handleNavigation = async () => {
        const pathname = window.location.pathname;
        if (pathname === '/reset') {
          handleSetLocation({ sidebar: [{ id: NAV_ID }] });
          location.values.closed = [];
          layout.values.layoutMode = 'solo';
          window.location.pathname = '/';
          return;
        }

        const startingLayout = removePart(location.values.active, 'solo');
        const layoutFromUri = uriToSoloPart(pathname);
        if (!layoutFromUri) {
          const toAttend = handleSetLocation(startingLayout);
          layout.values.layoutMode = 'deck';
          await dispatch?.(createIntent(LayoutAction.ScrollIntoView, { id: toAttend }));
          return;
        }

        const toAttend = handleSetLocation(mergeLayoutParts(layoutFromUri, startingLayout));
        layout.values.layoutMode = 'solo';
        await dispatch?.(createIntent(LayoutAction.ScrollIntoView, { id: toAttend }));
      };

      await handleNavigation();
      window.addEventListener('popstate', handleNavigation);

      unsubscriptionCallbacks.push(
        scheduledEffect(
          () => ({ selectedPath: soloPartToUri(location.values.active) }),
          ({ selectedPath }) => {
            // TODO(thure): In some browsers, this only preserves the most recent state change, even though this is not `history.replace`…
            history.pushState(null, '', `/${selectedPath}${window.location.search}`);
          },
        ),
      );

      layoutModeHistory.values.push(`${layout.values.layoutMode}`);
    },
    unload: async () => {
      layout.close();
      location.close();
      unsubscriptionCallbacks.forEach((unsubscribe) => unsubscribe?.());
      window.removeEventListener('popstate', handleNavigation);
    },
    provides: {
      settings: settings.values,
      layout: layout.values,
      location: location.values,
      translations: [...translations, ...stackTranslations],
      graph: {
        builder: (plugins) => {
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatchPromise;

          // TODO(burdon): Root menu isn't visible so nothing bound.
          return createExtension({
            id: DECK_PLUGIN,
            // NOTE(Zan): This is currently disabled.
            // TODO(Zan): Fullscreen needs to know the active node and provide that to the layout part.
            filter: (node): node is Node<null> => false,
            actions: () => [
              {
                id: `${LayoutAction.SetLayoutMode._tag}/fullscreen`,
                data: async () => {
                  await dispatch?.(createIntent(LayoutAction.SetLayoutMode, { layoutMode: 'fullscreen' }));
                },
                properties: {
                  label: ['toggle fullscreen label', { ns: DECK_PLUGIN }],
                  icon: 'ph--arrows-out--regular',
                  keyBinding: {
                    macos: 'ctrl+meta+f',
                    windows: 'shift+ctrl+f',
                  },
                },
              },
            ],
          });
        },
      },
      context: (props: PropsWithChildren) => (
        <LayoutContext.Provider value={layout.values}>
          <DeckContext.Provider value={deck.values}>{props.children}</DeckContext.Provider>
        </LayoutContext.Provider>
      ),
      root: () => {
        return (
          <DeckLayout
            layoutParts={location.values.active}
            showHints={settings.values.showHints}
            overscroll={settings.values.overscroll}
            toasts={layout.values.toasts}
            panels={panels}
            onDismissToast={(id) => {
              const index = layout.values.toasts.findIndex((toast) => toast.id === id);
              if (index !== -1) {
                // Allow time for the toast to animate out.
                // TODO(burdon): Factor out and unregister timeout.
                setTimeout(() => {
                  if (layout.values.toasts[index].id === currentUndoId) {
                    currentUndoId = undefined;
                  }
                  layout.values.toasts.splice(index, 1);
                }, 1_000);
              }
            }}
          />
        );
      },
      surface: {
        definitions: () =>
          createSurface({
            id: DECK_PLUGIN,
            role: 'settings',
            filter: (data): data is any => data.subject === DECK_PLUGIN,
            component: () => <LayoutSettings settings={settings.values} />,
          }),
      },
      intent: {
        resolvers: ({ plugins }) => {
          const graph = resolvePlugin(plugins, parseGraphPlugin)?.provides.graph;

          return [
            createResolver(DeckAction.UpdatePlankSize, (data) => {
              deck.values.plankSizing[data.id] = data.size;
            }),
            createResolver(IntentAction.ShowUndo, (data) => {
              // TODO(wittjosiah): Support undoing further back than the last action.
              if (currentUndoId) {
                layout.values.toasts = layout.values.toasts.filter((toast) => toast.id !== currentUndoId);
              }
              currentUndoId = `${IntentAction.ShowUndo._tag}-${Date.now()}`;
              layout.values.toasts = [
                ...layout.values.toasts,
                {
                  id: currentUndoId,
                  title: data.message ?? ['undo available label', { ns: DECK_PLUGIN }],
                  duration: 10_000,
                  actionLabel: ['undo action label', { ns: DECK_PLUGIN }],
                  actionAlt: ['undo action alt', { ns: DECK_PLUGIN }],
                  closeLabel: ['undo close label', { ns: DECK_PLUGIN }],
                  onAction: () => intentPlugin?.provides.intent.undo?.(),
                },
              ];
            }),
            createResolver(LayoutAction.SetLayout, handleSetLayout),
            createResolver(LayoutAction.SetLayoutMode, (data) => {
              const setMode = (mode: LayoutMode) => {
                const main = openIds(location.values.active, ['main']);
                const solo = openIds(location.values.active, ['solo']);
                const current = layout.values.layoutMode === 'solo' ? solo : main;
                // When un-soloing, the solo entry is added to the deck.
                const next = mode === 'solo' ? solo : [...main, ...solo];
                const removed = current.filter((id) => !next.includes(id));
                const closed = Array.from(
                  new Set([...location.values.closed.filter((id) => !next.includes(id)), ...removed]),
                );

                location.values.closed = closed;
                layout.values.layoutMode = mode;
              };

              return batch(() => {
                if ('layoutMode' in data) {
                  layoutModeHistory.values.push(layout.values.layoutMode);
                  setMode(data.layoutMode);
                } else if (data.revert) {
                  setMode(layoutModeHistory.values.pop() ?? 'solo');
                } else {
                  log.warn('Invalid layout mode', data);
                }
              });
            }),
            createResolver(LayoutAction.ScrollIntoView, (data) => {
              layout.values.scrollIntoView = data.id;
            }),
            // TODO(wittjosiah): Factor out navgiation from deck plugin.
            createResolver(NavigationAction.Open, (data) => {
              const previouslyOpenIds = new Set<string>(openIds(location.values.active));
              const layoutMode = layout.values.layoutMode;
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
                      positioning: settings.values.newPlankPositioning,
                    });
                  }
                };

                let newLayout = location.values.active;
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

                return handleSetLocation(newLayout);
              });

              const ids = openIds(location.values.active);
              const newlyOpen = ids.filter((i) => !previouslyOpenIds.has(i));

              return {
                data: { open: ids },
                intents: [
                  createIntent(LayoutAction.ScrollIntoView, { id: newlyOpen[0] ?? toAttend }),
                  // TODO(wittjosiah): ??
                  // intent.data?.object
                  //   ? [
                  //       {
                  //         action: NavigationAction.EXPOSE,
                  //         data: { id: fullyQualifiedId(intent.data.object) },
                  //       },
                  //     ]
                  //   : [],
                  ...(observability
                    ? newlyOpen.map((id) => {
                        const active = graph?.findNode(id)?.data;
                        const typename = isReactiveObject(active) ? getTypename(active) : undefined;
                        return createIntent(ObservabilityAction.SendEvent, {
                          name: 'navigation.activate',
                          properties: {
                            id,
                            typename,
                          },
                        });
                      })
                    : []),
                ],
              };
            }),
            createResolver(NavigationAction.AddToActive, (data) => {
              const layoutEntry = { id: data.id };
              const effectivePart = getEffectivePart(data.part, layout.values.layoutMode);

              handleSetLocation(
                openEntry(location.values.active, effectivePart, layoutEntry, {
                  positioning: data.positioning ?? settings.values.newPlankPositioning,
                  pivotId: data.pivotId,
                }),
              );

              const intents = [];
              if (data.scrollIntoView && layout.values.layoutMode === 'deck') {
                intents.push(createIntent(LayoutAction.ScrollIntoView, { id: data.id }));
              }

              return { intents };
            }),
            createResolver(NavigationAction.Close, (data) => {
              let newLayout = location.values.active;
              const layoutMode = layout.values.layoutMode;
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

              const toAttend = handleSetLocation(newLayout);
              return { intents: [createIntent(LayoutAction.ScrollIntoView, { id: toAttend })] };
            }),
            createResolver(NavigationAction.Set, (data) => {
              return batch(() => {
                const toAttend = handleSetLocation(data.activeParts);
                return { intents: [createIntent(LayoutAction.ScrollIntoView, { id: toAttend })] };
              });
            }),
            createResolver(NavigationAction.Adjust, (adjustment) => {
              return batch(() => {
                if (adjustment.type === 'increment-end' || adjustment.type === 'increment-start') {
                  handleSetLocation(
                    incrementPlank(location.values.active, {
                      type: adjustment.type,
                      layoutCoordinate: adjustment.layoutCoordinate,
                    }),
                  );
                }

                if (adjustment.type === 'solo') {
                  const entryId = adjustment.layoutCoordinate.entryId;
                  if (layout.values.layoutMode !== 'solo') {
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
          ];
        },
      },
    },
  };
};
