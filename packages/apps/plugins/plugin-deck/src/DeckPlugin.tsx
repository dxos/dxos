//
// Copyright 2023 DXOS.org
//

import { ArrowsOut, type IconProps } from '@phosphor-icons/react';
import { batch, effect } from '@preact/signals-core';
import { setAutoFreeze } from 'immer';
import React, { type PropsWithChildren } from 'react';

import { parseAttentionPlugin, type AttentionPluginProvides } from '@braneframe/plugin-attention';
import { parseClientPlugin, type ClientPluginProvides } from '@braneframe/plugin-client';
import { createExtension, type Node } from '@braneframe/plugin-graph';
import { ObservabilityAction } from '@braneframe/plugin-observability/meta';
import {
  type GraphProvides,
  IntentAction,
  type IntentPluginProvides,
  type Layout,
  LayoutAction,
  NavigationAction,
  parseGraphPlugin,
  parseIntentPlugin,
  type Plugin,
  type PluginDefinition,
  resolvePlugin,
  Toast as ToastSchema,
  SLUG_PATH_SEPARATOR,
  type LayoutPart,
  type LayoutEntry,
  type LayoutParts,
  isLayoutParts,
  isLayoutAdjustment,
  isLayoutMode,
  openIds,
  type LayoutMode,
  type IntentData,
} from '@dxos/app-framework';
import { type UnsubscribeCallback } from '@dxos/async';
import { create, getTypename, isReactiveObject } from '@dxos/echo-schema';
import { LocalStorageStore } from '@dxos/local-storage';
import { log } from '@dxos/log';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { translations as deckTranslations } from '@dxos/react-ui-deck';
import { Mosaic } from '@dxos/react-ui-mosaic';

import {
  DeckLayout,
  type DeckLayoutProps,
  LayoutContext,
  LayoutSettings,
  NAV_ID,
  DeckContext,
  type DeckContextType,
} from './components';
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
import { type NewPlankPositioning, type DeckPluginProvides, type DeckSettingsProps, type Overscroll } from './types';
import { checkAppScheme, getEffectivePart } from './util';

const isSocket = !!(globalThis as any).__args;

// TODO(mjamesderocher): Can we get this directly from Socket?
const appScheme = 'composer://';

// TODO(burdon): Evolve into customizable prefs, but pls leave for demo.
const customSlots: DeckLayoutProps['slots'] = {
  wallpaper: {
    classNames:
      'bg-cover bg-no-repeat dark:bg-[url(https://cdn.midjourney.com/3865ba61-f98a-4d94-b91a-1763ead01f4f/0_0.jpeg)]',
  },
  deck: {
    classNames: 'px-96 bg-neutral-50 __dark:bg-neutral-950 dark:bg-transparent dark:opacity-95',
  },
  plank: {
    classNames: 'mx-1 bg-neutral-25 dark:bg-neutral-900',
  },
};

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
  // TODO(burdon): GraphPlugin vs. IntentPluginProvides? (@wittjosiah).
  let intentPlugin: Plugin<IntentPluginProvides> | undefined;
  let attentionPlugin: Plugin<AttentionPluginProvides> | undefined;
  let clientPlugin: Plugin<ClientPluginProvides> | undefined;
  const unsubscriptionCallbacks = [] as (UnsubscribeCallback | undefined)[];
  let currentUndoId: string | undefined;
  let handleNavigation: () => Promise<void> | undefined;

  const settings = new LocalStorageStore<DeckSettingsProps>('dxos.org/settings/layout', {
    showFooter: false,
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
    popoverContent: null,
    popoverAnchorId: undefined,
    popoverOpen: false,
    toasts: [],
  });

  const deck = new LocalStorageStore<DeckContextType>('dxos.org/settings/deck', {
    plankSizing: {},
  });

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

  return {
    meta,
    ready: async (plugins) => {
      intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
      graphPlugin = resolvePlugin(plugins, parseGraphPlugin);
      attentionPlugin = resolvePlugin(plugins, parseAttentionPlugin);
      clientPlugin = resolvePlugin(plugins, parseClientPlugin);

      // prettier-ignore
      layout
        .prop({ key: 'layoutMode', storageKey: 'layout-mode', type: LocalStorageStore.enum<LayoutMode>() })
        .prop({ key: 'sidebarOpen', storageKey: 'sidebar-open', type: LocalStorageStore.bool() })
        .prop({ key: 'complementarySidebarOpen', storageKey: 'complementary-sidebar-open', type: LocalStorageStore.bool() });

      // prettier-ignore
      deck.prop({ key: 'plankSizing', storageKey: 'plank-sizing', type: LocalStorageStore.json<Record<string, number>>() });

      // prettier-ignore
      location
        .prop({ key: 'active', storageKey: 'active', type: LocalStorageStore.json<LayoutParts>() })
        .prop({ key: 'closed', storageKey: 'closed', type: LocalStorageStore.json<string[]>() });

      unsubscriptionCallbacks.push(
        clientPlugin?.provides.client.shell.onReset(() => {
          layout.expunge();
          location.expunge();
          deck.expunge();
        }),
      );

      // prettier-ignore
      settings
        .prop({ key: 'showFooter', storageKey: 'show-footer', type: LocalStorageStore.bool() })
        .prop({ key: 'customSlots', storageKey: 'customSlots', type: LocalStorageStore.bool() })
        .prop({ key: 'flatDeck', storageKey: 'flatDeck', type: LocalStorageStore.bool() })
        .prop({ key: 'enableNativeRedirect', storageKey: 'enable-native-redirect', type: LocalStorageStore.bool() })
        .prop({ key: 'disableDeck', storageKey: 'disable-deck', type: LocalStorageStore.bool() }) // Deprecated.
        .prop({ key: 'newPlankPositioning', storageKey: 'newPlankPositioning', type: LocalStorageStore.enum<NewPlankPositioning>() })
        .prop({ key: 'overscroll', storageKey: 'overscroll', type: LocalStorageStore.enum<Overscroll>() });

      if (!isSocket && settings.values.enableNativeRedirect) {
        checkAppScheme(appScheme);
      }

      handleNavigation = async () => {
        const layoutFromUri = uriToSoloPart(window.location.pathname);
        if (!layoutFromUri) {
          return;
        }

        const startingLayout = removePart(location.values.active, 'solo');
        location.values.active = mergeLayoutParts(layoutFromUri, startingLayout);
        layout.values.layoutMode = 'solo';
      };

      await handleNavigation();
      window.addEventListener('popstate', handleNavigation);

      unsubscriptionCallbacks.push(
        effect(() => {
          const selectedPath = soloPartToUri(location.values.active);
          // TODO(thure): In some browsers, this only preserves the most recent state change, even though this is not `history.replace`…
          history.pushState(null, '', `/${selectedPath}${window.location.search}`);
        }),
      );

      unsubscriptionCallbacks.push(
        effect(() => {
          const soloId = location.values.active.solo?.[0].id;
          if (layout.values.layoutMode === 'solo' && soloId && layout.values.scrollIntoView !== soloId) {
            void intentPlugin?.provides.intent.dispatch({
              action: LayoutAction.SCROLL_INTO_VIEW,
              data: { id: soloId },
            });
          }
        }),
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
      translations: [...translations, ...deckTranslations],
      graph: {
        builder: () => {
          // TODO(burdon): Root menu isn't visible so nothing bound.
          return createExtension({
            id: DECK_PLUGIN,
            filter: (node): node is Node<null> => node.id === 'root',
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
                  icon: (props: IconProps) => <ArrowsOut {...props} />,
                  iconSymbol: 'ph--arrows-out--regular',
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
          <Mosaic.Root>
            <DeckLayout
              attention={attentionPlugin?.provides.attention ?? { attended: new Set() }}
              layoutParts={location.values.active}
              overscroll={settings.values.overscroll}
              flatDeck={settings.values.flatDeck}
              showHintsFooter={settings.values.showFooter}
              slots={settings.values.customSlots ? customSlots : undefined}
              toasts={layout.values.toasts}
              onDismissToast={(id) => {
                const index = layout.values.toasts.findIndex((toast) => toast.id === id);
                if (index !== -1) {
                  // Allow time for the toast to animate out.
                  setTimeout(() => {
                    if (layout.values.toasts[index].id === currentUndoId) {
                      currentUndoId = undefined;
                    }
                    layout.values.toasts.splice(index, 1);
                  }, 1000);
                }
              }}
            />
            <Mosaic.DragOverlay />
          </Mosaic.Root>
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
              return batch(() => {
                if (!intent.data) {
                  return;
                }

                if (intent.data?.revert) {
                  layout.values.layoutMode = layoutModeHistory.values.pop() ?? 'solo';
                  return { data: true };
                }

                if (isLayoutMode(intent?.data?.layoutMode)) {
                  layoutModeHistory.values.push(layout.values.layoutMode);
                  layout.values.layoutMode = intent.data.layoutMode;
                } else {
                  log.warn('Invalid layout mode', intent?.data?.layoutMode);
                }

                return { data: true };
              });
            }

            case LayoutAction.SCROLL_INTO_VIEW: {
              layout.values.scrollIntoView = intent.data?.id ?? undefined;
              return undefined;
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

                const newPlankPositioning = settings.values.newPlankPositioning;

                const processLayoutEntry = (partName: string, entryString: string, currentLayout: any) => {
                  const [id, path] = entryString.split(SLUG_PATH_SEPARATOR);
                  const layoutEntry: LayoutEntry = {
                    id,
                    ...(path ? { path } : {}),
                  };
                  const effectivePart = getEffectivePart(partName as LayoutPart, layoutMode);
                  if (
                    layoutMode === 'deck' &&
                    effectivePart === 'main' &&
                    currentLayout[effectivePart]?.some((entry: LayoutEntry) => entry.id === id) &&
                    !intent.data?.noToggle
                  ) {
                    // If we're in deck mode and the main part is already open, toggle it closed.
                    return closeEntry(currentLayout, { part: effectivePart as LayoutPart, entryId: id });
                  } else {
                    return openEntry(currentLayout, effectivePart, layoutEntry, {
                      positioning: newPlankPositioning,
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
                    // Legacy single string entry
                    newLayout = processLayoutEntry(partName, layoutEntries, newLayout);
                  }
                });

                location.values.active = newLayout;
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

              location.values.active = openEntry(location.values.active, data.part, layoutEntry, {
                positioning: data.positioning ?? settings.values.newPlankPositioning,
                pivotId: data.pivotId,
              });

              const intents = [];
              if (data.scrollIntoView) {
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

                location.values.active = newLayout;

                return { data: true };
              });
            }

            // TODO(wittjosiah): Factor out.
            case NavigationAction.SET: {
              return batch(() => {
                if (isLayoutParts(intent.data?.activeParts)) {
                  location.values.active = intent.data!.activeParts;
                }
                return { data: true };
              });
            }

            case NavigationAction.ADJUST: {
              return batch(() => {
                if (isLayoutAdjustment(intent.data)) {
                  const adjustment = intent.data;

                  if (adjustment.type === 'increment-end' || adjustment.type === 'increment-start') {
                    const nextActive = incrementPlank(location.values.active, {
                      type: adjustment.type,
                      layoutCoordinate: adjustment.layoutCoordinate,
                    });
                    location.values.active = nextActive;
                  }

                  if (adjustment.type === 'solo') {
                    const entryId = adjustment.layoutCoordinate.entryId;
                    if (layout.values.layoutMode !== 'solo') {
                      // Solo the entry.
                      return {
                        data: true,
                        intents: [
                          [
                            { action: LayoutAction.SET_LAYOUT_MODE, data: { layoutMode: 'solo' } },
                            { action: NavigationAction.OPEN, data: { activeParts: { solo: [entryId] } } },
                          ],
                        ],
                      };
                    } else {
                      // Un-solo the current entry.
                      return {
                        data: true,
                        intents: [
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
