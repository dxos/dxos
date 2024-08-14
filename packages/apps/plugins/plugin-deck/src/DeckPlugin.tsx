//
// Copyright 2023 DXOS.org
//

import { ArrowsOut, type IconProps } from '@phosphor-icons/react';
import { batch, effect } from '@preact/signals-core';
import { setAutoFreeze } from 'immer';
import React, { type PropsWithChildren } from 'react';

import { parseAttentionPlugin, type AttentionPluginProvides } from '@braneframe/plugin-attention';
import { createExtension, type Node } from '@braneframe/plugin-graph';
import {
  type GraphProvides,
  IntentAction,
  type IntentPluginProvides,
  type IntentResult,
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
  isPartAdjustment,
} from '@dxos/app-framework';
import { create } from '@dxos/echo-schema';
import { LocalStorageStore } from '@dxos/local-storage';
import { translations as deckTranslations } from '@dxos/react-ui-deck';
import { Mosaic } from '@dxos/react-ui-mosaic';

import {
  activePartsToUri,
  closeEntry,
  incrementPlank,
  openEntry,
  toggleSolo,
  uriToActiveParts,
  mergeLayoutParts,
} from './Layout';
import { DeckLayout, type DeckLayoutProps, LayoutContext, LayoutSettings, NAV_ID } from './components';
import meta, { DECK_PLUGIN } from './meta';
import translations from './translations';
import { type NewPlankPositioning, type DeckPluginProvides, type DeckSettingsProps, type Overscroll } from './types';
import { checkAppScheme } from './util';

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
// our signal implementation needs to add some hidden properties to the values.
// TODO(Zan): Move this to a more global location if we use immer more broadly.
setAutoFreeze(false);

export const DeckPlugin = ({
  observability,
}: {
  observability?: boolean;
} = {}): PluginDefinition<DeckPluginProvides> => {
  let graphPlugin: Plugin<GraphProvides> | undefined;
  // TODO(burdon): GraphPlugin vs. IntentPluginProvides? (@wittjosiah).
  let intentPlugin: Plugin<IntentPluginProvides> | undefined;
  let attentionPlugin: Plugin<AttentionPluginProvides> | undefined;
  let currentUndoId: string | undefined;
  let handleNavigation: () => Promise<void | IntentResult> | undefined;

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
    fullscreen: false,
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

  const location = create<{ active: LayoutParts; closed: string[] }>({
    active: { sidebar: [{ id: NAV_ID }] },
    closed: [],
  });

  const handleSetLayout = ({
    element,
    state,
    component,
    subject,
    anchorId,
    dialogBlockAlign,
  }: LayoutAction.SetLayout) => {
    switch (element) {
      case 'fullscreen': {
        layout.values.fullscreen = state ?? !layout.values.fullscreen;
        return { data: true };
      }

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

      layout.prop({ key: 'sidebarOpen', storageKey: 'sidebar-open', type: LocalStorageStore.bool() });

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
        const layoutFromUri = uriToActiveParts(window.location.pathname);
        const startingLayout = location.active;
        location.active = mergeLayoutParts(layoutFromUri, startingLayout);
      };

      await handleNavigation();

      // NOTE(thure): This *must* follow the `await … dispatch()` for navigation, otherwise it will lose the initial
      //   active parts
      effect(() => {
        const selectedPath = activePartsToUri(location.active);
        // TODO(thure): In some browsers, this only preserves the most recent state change, even though this is not `history.replace`…
        history.pushState(null, '', `${selectedPath}${window.location.search}`);
      });

      window.addEventListener('popstate', handleNavigation);
    },
    unload: async () => {
      window.removeEventListener('popstate', handleNavigation);
      layout.close();
    },
    provides: {
      settings: settings.values,
      layout: layout.values,
      location,
      translations: [...translations, ...deckTranslations],
      graph: {
        builder: () => {
          // TODO(burdon): Root menu isn't visible so nothing bound.
          return createExtension({
            id: DECK_PLUGIN,
            filter: (node): node is Node<null> => node.id === 'root',
            actions: () => [
              {
                id: `${LayoutAction.SET_LAYOUT}/fullscreen`,
                data: async () => {
                  await intentPlugin?.provides.intent.dispatch({
                    plugin: DECK_PLUGIN,
                    action: LayoutAction.SET_LAYOUT,
                    data: { element: 'fullscreen' },
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
        <LayoutContext.Provider value={layout.values}>{props.children}</LayoutContext.Provider>
      ),
      root: () => {
        return (
          <Mosaic.Root>
            <DeckLayout
              attention={attentionPlugin?.provides.attention ?? { attended: new Set() }}
              layoutParts={location.active}
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

            case LayoutAction.SCROLL_INTO_VIEW: {
              layout.values.scrollIntoView = intent.data?.id ?? undefined;
              return undefined;
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
              batch(() => {
                if (!intent.data?.activeParts) {
                  return;
                }

                const newPlankPositioning = settings.values.newPlankPositioning;

                const processLayoutEntry = (partName: string, entryString: string, currentLayout: any) => {
                  const [id, path] = entryString.split(SLUG_PATH_SEPARATOR);
                  const layoutEntry: LayoutEntry = {
                    id,
                    ...(path ? { path } : {}),
                  };
                  return openEntry(currentLayout, partName as LayoutPart, layoutEntry, {
                    positioning: newPlankPositioning,
                  });
                };

                let newLayout = location.active;

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

                location.active = newLayout;
              });

              return { data: true };
            }

            case NavigationAction.ADD_TO_ACTIVE: {
              console.warn('Add to active is not yet implemented');
              console.log('Called with', intent.data);

              return { data: true };
            }

            // case NavigationAction.ADD_TO_ACTIVE: {
            //   const { id, scrollIntoView, pivot } = intent.data as NavigationAction.AddToActive;
            //   batch(() => {
            //     if (isActiveParts(location.active)) {
            //       const main = Array.isArray(location.active.main) ? [...location.active.main] : [location.active.main];

            //       if (!main.includes(id)) {
            //         // Check if the id is not already in the main array
            //         if (pivot) {
            //           const pivotIndex = main.indexOf(pivot.id);
            //           if (pivotIndex !== -1) {
            //             main.splice(pivotIndex + (pivot.position === 'add-after' ? 1 : 0), 0, id);
            //           } else {
            //             main.push(id);
            //           }
            //         } else {
            //           const newIds = [id];
            //           const partMembers = new Set<string>();
            //           switch (settings.values.newPlankPositioning) {
            //             case 'start': {
            //               newIds.forEach((newId) => partMembers.add(newId));
            //               main.forEach((existingId) => partMembers.add(existingId));
            //               break;
            //             }
            //             case 'end':
            //             default: {
            //               main.forEach((existingId) => partMembers.add(existingId));
            //               newIds.forEach((newId) => partMembers.add(newId));
            //               break;
            //             }
            //           }
            //           main.splice(0, main.length, ...Array.from(partMembers).filter(Boolean));
            //         }

            //         location.active = {
            //           ...location.active,
            //           main,
            //         };
            //       }
            //     } else {
            //       location.active = { main: [id] };
            //     }
            //   });

            //   return {
            //     data: true,
            //     intents: scrollIntoView ? [[{ action: LayoutAction.SCROLL_INTO_VIEW, data: { id } }]] : undefined,
            //   };
            // }

            // TODO(wittjosiah): Factor out.
            case NavigationAction.CLOSE: {
              batch(() => {
                if (!intent.data) {
                  return;
                }
                const intentParts = intent.data.activeParts;

                let newLayout = location.active;

                Object.keys(intentParts).forEach((partName: string) => {
                  const ids = intentParts[partName];
                  if (Array.isArray(ids)) {
                    ids.forEach((id: string) => {
                      newLayout = closeEntry(newLayout, { part: partName as LayoutPart, entryId: id });
                    });
                  } else {
                    // Legacy single string entry
                    newLayout = closeEntry(newLayout, { part: partName as LayoutPart, entryId: ids });
                  }
                });

                location.active = newLayout;
              });

              return { data: true };
            }

            // TODO(wittjosiah): Factor out.
            case NavigationAction.SET: {
              batch(() => {
                if (isLayoutParts(intent.data?.activeParts)) {
                  location.active = intent.data!.activeParts;
                }
              });
              return { data: true };
            }

            case NavigationAction.ADJUST: {
              batch(() => {
                if (isPartAdjustment(intent.data)) {
                  const adjustment = intent.data;

                  const { part, index } = adjustment.layoutCoordinate;

                  // TODO(ZAN): Take this ID directly in the intent.
                  const id = location.active[part as LayoutPart]?.[index]?.id;
                  if (!id) {
                    console.warn('Hol up, no ID found at the specified layoutCoordinate in NavigationAction.ADJUST');
                    return;
                  }

                  if (adjustment.type === 'increment-end' || adjustment.type === 'increment-start') {
                    const nextActive = incrementPlank(location.active, {
                      type: adjustment.type,
                      layoutCoordinate: { part, entryId: id },
                    });
                    location.active = nextActive;
                  }

                  // TODO(Zan): Reimplement pinning if we ever put that functionality back in.

                  if ((adjustment.type as any) === 'solo') {
                    const nextActive = toggleSolo(location.active, {
                      entryId: id,
                      part,
                    });

                    location.active = nextActive;
                  }
                }
              });
              return { data: true };
            }
          }
        },
      },
    },
  };
};
