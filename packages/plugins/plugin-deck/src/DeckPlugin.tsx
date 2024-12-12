//
// Copyright 2023 DXOS.org
//

import { batch } from '@preact/signals-core';
import { setAutoFreeze } from 'immer';
import React, { type PropsWithChildren } from 'react';

import {
  filterPlugins,
  type GraphProvides,
  IntentAction,
  type IntentData,
  type IntentPluginProvides,
  isLayoutAdjustment,
  isLayoutMode,
  isLayoutParts,
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
import { getTypename } from '@dxos/echo-schema';
import { scheduledEffect } from '@dxos/echo-signals/core';
import { create, isReactiveObject } from '@dxos/live-object';
import { LocalStorageStore } from '@dxos/local-storage';
import { log } from '@dxos/log';
import { type AttentionPluginProvides, parseAttentionPlugin } from '@dxos/plugin-attention';
import { createExtension, type Node } from '@dxos/plugin-graph';
import { ObservabilityAction } from '@dxos/plugin-observability/meta';
import { fullyQualifiedId } from '@dxos/react-client/echo';
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

//
// Intents
//
const DECK_ACTION = 'dxos.org/plugin/deck';

export enum DeckAction {
  UPDATE_PLANK_SIZE = `${DECK_ACTION}/update-plank-size`,
}

export namespace DeckAction {
  export type UpdatePlankSize = IntentData<{ id: string; size: number }>;
}

export const DeckPlugin = ({
  observability,
}: {
  observability?: boolean;
} = {}): PluginDefinition<DeckPluginProvides> => {
  let graphPlugin: Plugin<GraphProvides> | undefined;
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
  }: LayoutAction.SetLayout) => {
    switch (element) {
      case 'sidebar': {
        layout.values.sidebarOpen = state ?? !layout.values.sidebarOpen;
        return { data: true };
      }

      case 'complementary': {
        layout.values.complementarySidebarOpen = !!state;
        // TODO(thure): Hoist content into the c11y sidebar of Deck.
        // layout.values.complementarySidebarContent = component || subject ? { component, subject } : null;
        return { data: true };
      }

      case 'dialog': {
        layout.values.dialogOpen = state ?? Boolean(component);
        layout.values.dialogContent = component ? { component, subject } : null;
        layout.values.dialogBlockAlign = dialogBlockAlign ?? 'center';
        layout.values.dialogType = dialogType;
        return { data: true };
      }

      case 'popover': {
        layout.values.popoverOpen = state ?? Boolean(component);
        layout.values.popoverContent = component ? { component, subject } : null;
        layout.values.popoverAnchorId = anchorId;
        return { data: true };
      }

      case 'toast': {
        if (ToastSchema.safeParse(subject).success) {
          layout.values.toasts = [...layout.values.toasts, subject];
          return { data: true };
        }
      }
    }
  };

  /**
   * Update the active state and ensure that attention is on an active element.
   */
  const handleSetLocation = (next: LayoutParts) => {
    const part = layout.values.layoutMode === 'solo' ? 'solo' : 'main';
    const ids = openIds(next, [part]);

    if (attentionPlugin) {
      const attended = attentionPlugin.provides.attention.attended;
      const [attendedId] = Array.from(attended);
      const isAttendedAvailable = !!attendedId && ids.includes(attendedId);
      if (!isAttendedAvailable) {
        const currentIds = location.values.active[part]?.map(({ id }) => id) ?? [];
        const attendedIndex = currentIds.indexOf(attendedId);
        // If outside of bounds, focus on the first/last plank, otherwise focus on the new plank in the same position.
        const index = attendedIndex === -1 ? 0 : attendedIndex >= ids.length ? ids.length - 1 : attendedIndex;
        const nextAttended = next[part]?.[index].id;
        void intentPlugin?.provides.intent.dispatch({
          action: LayoutAction.SCROLL_INTO_VIEW,
          data: { id: nextAttended },
        });
      }
    }

    const current = openIds(location.values.active, [part]);
    const removed = current.filter((id) => !ids.includes(id));
    const closed = Array.from(new Set([...location.values.closed.filter((id) => !ids.includes(id)), ...removed]));

    location.values.closed = closed;
    location.values.active = next;
  };

  return {
    meta,
    ready: async (plugins) => {
      intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
      graphPlugin = resolvePlugin(plugins, parseGraphPlugin);
      attentionPlugin = resolvePlugin(plugins, parseAttentionPlugin);

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
          handleSetLocation(startingLayout);
          layout.values.layoutMode = 'deck';
          return;
        }

        handleSetLocation(mergeLayoutParts(layoutFromUri, startingLayout));
        layout.values.layoutMode = 'solo';
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
        builder: () => {
          // TODO(burdon): Root menu isn't visible so nothing bound.
          return createExtension({
            id: DECK_PLUGIN,
            // NOTE(Zan): This is currently disabled.
            // TODO(Zan): Fullscreen needs to know the active node and provide that to the layout part.
            filter: (node): node is Node<null> => false,
            actions: () => [
              {
                id: `${LayoutAction.SET_LAYOUT_MODE}/fullscreen`,
                data: async () => {
                  await intentPlugin?.provides.intent.dispatch({
                    plugin: DECK_PLUGIN,
                    action: LayoutAction.SET_LAYOUT_MODE,
                    data: { layoutMode: 'fullscreen' },
                  });
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
        component: ({ data, role }) => {
          switch (role) {
            case 'settings':
              return data.plugin === meta.id ? <LayoutSettings settings={settings.values} /> : null;
          }
          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case LayoutAction.SET_LAYOUT: {
              return intent.data && handleSetLayout(intent.data as LayoutAction.SetLayout);
            }

            case LayoutAction.SET_LAYOUT_MODE: {
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

              // TODO(wittjosiah): Update closed state.
              return batch(() => {
                if (!intent.data) {
                  return;
                }

                if (intent.data?.revert) {
                  setMode(layoutModeHistory.values.pop() ?? 'solo');
                  return { data: true };
                }

                if (isLayoutMode(intent?.data?.layoutMode)) {
                  layoutModeHistory.values.push(layout.values.layoutMode);
                  setMode(intent.data.layoutMode);
                } else {
                  log.warn('Invalid layout mode', intent?.data?.layoutMode);
                }

                return { data: true };
              });
            }

            case LayoutAction.SCROLL_INTO_VIEW: {
              layout.values.scrollIntoView = intent.data?.id ?? undefined;
              return { data: true };
            }

            case DeckAction.UPDATE_PLANK_SIZE: {
              const { id, size } = intent.data as DeckAction.UpdatePlankSize;
              deck.values.plankSizing[id] = size;
              return { data: true };
            }

            case IntentAction.SHOW_UNDO: {
              // TODO(wittjosiah): Support undoing further back than the last action.
              if (currentUndoId) {
                layout.values.toasts = layout.values.toasts.filter((toast) => toast.id !== currentUndoId);
              }
              currentUndoId = `${IntentAction.SHOW_UNDO}-${Date.now()}`;
              const title =
                // TODO(wittjosiah): How to handle chains better?
                intent.data?.results?.[0]?.result?.undoable?.message ??
                translations[0]['en-US']['dxos.org/plugin/deck']['undo available label'];
              layout.values.toasts = [
                ...layout.values.toasts,
                {
                  id: currentUndoId,
                  title,
                  duration: 10_000,
                  actionLabel: translations[0]['en-US']['dxos.org/plugin/deck']['undo action label'],
                  actionAlt: translations[0]['en-US']['dxos.org/plugin/deck']['undo action alt'],
                  closeLabel: translations[0]['en-US']['dxos.org/plugin/deck']['undo close label'],
                  onAction: () => intentPlugin?.provides.intent.undo?.(),
                },
              ];
              return { data: true };
            }

            case NavigationAction.OPEN: {
              const previouslyOpenIds = new Set<string>(openIds(location.values.active));
              const layoutMode = layout.values.layoutMode;
              batch(() => {
                if (!intent.data || !intent.data?.activeParts) {
                  return;
                }

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
                    !intent.data?.noToggle
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
                Object.entries(intent.data.activeParts).forEach(([partName, layoutEntries]) => {
                  if (Array.isArray(layoutEntries)) {
                    layoutEntries.forEach((activePartEntry: string) => {
                      newLayout = processLayoutEntry(partName, activePartEntry, newLayout);
                    });
                  } else if (typeof layoutEntries === 'string') {
                    // Legacy single string entry.
                    newLayout = processLayoutEntry(partName, layoutEntries, newLayout);
                  }
                });

                handleSetLocation(newLayout);
              });

              const ids = openIds(location.values.active);
              const newlyOpen = ids.filter((i) => !previouslyOpenIds.has(i));

              return {
                data: { ids },
                intents: [
                  newlyOpen.length > 0
                    ? [
                        {
                          action: LayoutAction.SCROLL_INTO_VIEW,
                          data: { id: newlyOpen[0] },
                        },
                      ]
                    : [],
                  intent.data?.object
                    ? [
                        {
                          action: NavigationAction.EXPOSE,
                          data: { id: fullyQualifiedId(intent.data.object) },
                        },
                      ]
                    : [],
                  observability
                    ? newlyOpen.map((id) => {
                        const active = graphPlugin?.provides.graph.findNode(id)?.data;
                        const typename = isReactiveObject(active) ? getTypename(active) : undefined;
                        return {
                          action: ObservabilityAction.SEND_EVENT,
                          data: {
                            name: 'navigation.activate',
                            properties: {
                              id,
                              typename,
                            },
                          },
                        };
                      })
                    : [],
                ],
              };
            }

            case NavigationAction.ADD_TO_ACTIVE: {
              const data = intent.data as NavigationAction.AddToActive;
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
                intents.push([
                  {
                    action: LayoutAction.SCROLL_INTO_VIEW,
                    data: { id: data.id },
                  },
                ]);
              }

              return { data: true, intents };
            }

            case NavigationAction.CLOSE: {
              return batch(() => {
                if (!intent.data) {
                  return;
                }
                let newLayout = location.values.active;
                const layoutMode = layout.values.layoutMode;
                const intentParts = intent.data.activeParts;
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

                handleSetLocation(newLayout);
                return { data: true };
              });
            }

            // TODO(wittjosiah): Factor out.
            case NavigationAction.SET: {
              return batch(() => {
                if (isLayoutParts(intent.data?.activeParts)) {
                  handleSetLocation(intent.data!.activeParts);
                }
                return { data: true };
              });
            }

            case NavigationAction.ADJUST: {
              return batch(() => {
                if (isLayoutAdjustment(intent.data)) {
                  const adjustment = intent.data;
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
                        data: true,
                        intents: [
                          // NOTE: The order of these is important.
                          [
                            { action: NavigationAction.OPEN, data: { activeParts: { solo: [entryId] } } },
                            { action: LayoutAction.SET_LAYOUT_MODE, data: { layoutMode: 'solo' } },
                          ],
                        ],
                      };
                    } else {
                      // Un-solo the current entry.
                      return {
                        data: true,
                        intents: [
                          // NOTE: The order of these is important.
                          [
                            { action: LayoutAction.SET_LAYOUT_MODE, data: { layoutMode: 'deck' } },
                            { action: NavigationAction.CLOSE, data: { activeParts: { solo: [entryId] } } },
                            {
                              action: NavigationAction.OPEN,
                              data: { noToggle: true, activeParts: { main: [entryId] } },
                            },
                            { action: LayoutAction.SCROLL_INTO_VIEW, data: { id: entryId } },
                          ],
                        ],
                      };
                    }
                  }
                }
              });
            }
          }
        },
      },
    },
  };
};
