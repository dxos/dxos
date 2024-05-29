//
// Copyright 2023 DXOS.org
//

import { ArrowsOut, type IconProps } from '@phosphor-icons/react';
import { batch, effect } from '@preact/signals-core';
import React, { type PropsWithChildren } from 'react';

import { ObservabilityAction } from '@braneframe/plugin-observability/meta';
import {
  type ActiveParts,
  type Attention,
  type GraphProvides,
  IntentAction,
  type IntentPluginProvides,
  type IntentResult,
  isActiveParts,
  isAdjustTransaction,
  type Layout,
  LayoutAction,
  type Location,
  NavigationAction,
  parseGraphPlugin,
  parseIntentPlugin,
  type Plugin,
  type PluginDefinition,
  resolvePlugin,
  Toast as ToastSchema,
} from '@dxos/app-framework';
import { create } from '@dxos/echo-schema';
import { Keyboard } from '@dxos/keyboard';
import { LocalStorageStore } from '@dxos/local-storage';
import { AttentionProvider, translations as deckTranslations } from '@dxos/react-ui-deck';
import { Mosaic } from '@dxos/react-ui-mosaic';

import { DeckLayout, type DeckLayoutProps, LayoutContext, LayoutSettings, NAV_ID } from './components';
import meta, { DECK_PLUGIN } from './meta';
import translations from './translations';
import { type DeckPluginProvides, type DeckSettingsProps } from './types';
import { activeToUri, checkAppScheme, uriToActive } from './util';
import { applyActiveAdjustment } from './util/apply-active-adjustment';

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

export const DeckPlugin = ({
  observability,
}: {
  observability?: boolean;
} = {}): PluginDefinition<DeckPluginProvides> => {
  let graphPlugin: Plugin<GraphProvides> | undefined;
  // TODO(burdon): GraphPlugin vs. IntentPluginProvides? (@wittjosiah).
  let intentPlugin: Plugin<IntentPluginProvides> | undefined;
  let currentUndoId: string | undefined;
  let handleNavigation: () => Promise<void | IntentResult> | undefined;

  const settings = new LocalStorageStore<DeckSettingsProps>('dxos.org/settings/layout', {
    showFooter: false,
    customSlots: false,
    enableNativeRedirect: false,
    deck: true,
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

  const location = create<Location>({
    active: {},
    closed: [],
  });

  const attention = create<Attention>({
    attended: new Set(),
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

      layout.prop({ key: 'sidebarOpen', storageKey: 'sidebar-open', type: LocalStorageStore.bool() });

      // prettier-ignore
      settings
        .prop({ key: 'showFooter', storageKey: 'show-footer', type: LocalStorageStore.bool() })
        .prop({ key: 'customSlots', storageKey: 'customSlots', type: LocalStorageStore.bool() })
        .prop({ key: 'enableNativeRedirect', storageKey: 'enable-native-redirect', type: LocalStorageStore.bool() })
        .prop({ key: 'deck', storageKey: 'deck', type: LocalStorageStore.bool() });

      if (!isSocket && settings.values.enableNativeRedirect) {
        checkAppScheme(appScheme);
      }

      effect(() => {
        const id = Array.from(attention.attended ?? [])[0];
        const path = id && graphPlugin?.provides.graph.getPath({ target: id });
        if (path) {
          Keyboard.singleton.setCurrentContext(path.join('/'));
        }
      });

      handleNavigation = async () => {
        const activeParts = uriToActive(window.location.pathname);
        if (activeParts) {
          return intentPlugin?.provides.intent.dispatch({
            // TODO(thure): handle popstate
            action: NavigationAction.OPEN,
            data: { activeParts },
          });
        }
      };

      await handleNavigation();

      // NOTE(thure): This *must* follow the `await … dispatch()` for navigation, otherwise it will lose the initial
      //   active parts
      effect(() => {
        const selectedPath = activeToUri(location.active);
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
      attention,
      translations: [...translations, ...deckTranslations],
      graph: {
        builder: (_, graph) => {
          // TODO(burdon): Root menu isn't visible so nothing bound.
          graph.addNodes({
            id: `${LayoutAction.SET_LAYOUT}/fullscreen`,
            data: () =>
              intentPlugin?.provides.intent.dispatch({
                plugin: DECK_PLUGIN,
                action: LayoutAction.SET_LAYOUT,
                data: { element: 'fullscreen' },
              }),
            properties: {
              label: ['toggle fullscreen label', { ns: DECK_PLUGIN }],
              icon: (props: IconProps) => <ArrowsOut {...props} />,
              keyBinding: {
                macos: 'ctrl+meta+f',
                windows: 'shift+ctrl+f',
              },
            },
            edges: [['root', 'inbound']],
          });
        },
      },
      context: (props: PropsWithChildren) => {
        return (
          <AttentionProvider
            attended={attention.attended}
            onChangeAttend={(nextAttended) => {
              // TODO(thure): Is this / could this be better handled by an intent?
              attention.attended = nextAttended;
            }}
          >
            <LayoutContext.Provider value={layout.values}>{props.children}</LayoutContext.Provider>
          </AttentionProvider>
        );
      },
      root: () => {
        return (
          <Mosaic.Root>
            <DeckLayout
              attention={attention}
              location={location}
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
              // TODO(wittjosiah): Factor out.
              batch(() => {
                if (intent.data) {
                  location.active =
                    isActiveParts(location.active) && Object.keys(location.active).length > 0
                      ? Object.entries(intent.data.activeParts).reduce<Record<string, string | string[]>>(
                          (acc: ActiveParts, [part, ids]) => {
                            // NOTE(thure): Only `main` is an ordered collection, others are currently monolithic
                            if (part === 'main') {
                              const partMembers = new Set<string>();
                              const prev = new Set(
                                // TODO(burdon): Explain why this can be an array or string.
                                Array.isArray(acc[part]) ? (acc[part] as string[]) : [acc[part] as string],
                              );
                              // NOTE(thure): The order of the following `forEach` calls will determine to which end of
                              //   the current `main` part newly opened slugs are added.
                              Array.from(prev).forEach((id) => partMembers.add(id));
                              // Add to end.
                              (Array.isArray(ids) ? ids : [ids]).forEach((id) => !prev.has(id) && partMembers.add(id));
                              acc[part] = Array.from(partMembers).filter(Boolean);
                            } else {
                              // NOTE(thure): An open action for a monolithic part will overwrite any slug currently in
                              //   that position.
                              acc[part] = Array.isArray(ids) ? ids[0] : ids;
                            }

                            return acc;
                          },
                          { ...location.active },
                        )
                      : {
                          sidebar: NAV_ID,
                          ...intent.data.activeParts,
                          main: [
                            ...(intent.data.activeParts.main ?? []),
                            ...(location.active
                              ? isActiveParts(location.active)
                                ? [location.active.main].filter(Boolean)
                                : [location.active]
                              : []),
                          ],
                        };
                }
              });

              const openIds: string[] = Array.from(
                location.active
                  ? Object.values(location.active).reduce((acc, ids) => {
                      Array.isArray(ids) ? ids.forEach((id) => acc.add(id)) : acc.add(ids);
                      return acc;
                    }, new Set<string>())
                  : new Set<string>(),
              );

              return {
                data: {
                  ids: openIds,
                },
                intents: [
                  observability
                    ? openIds.map((id) => ({
                        // TODO(thure): Can this handle Deck’s multifariousness?
                        action: ObservabilityAction.SEND_EVENT,
                        data: {
                          name: 'navigation.activate',
                          properties: {
                            id,
                            schema: graphPlugin?.provides.graph.findNode(id)?.data?.__typename,
                          },
                        },
                      }))
                    : [],
                ],
              };
            }

            // TODO(wittjosiah): Factor out.
            case NavigationAction.CLOSE: {
              batch(() => {
                // NOTE(thure): the close action is only supported when `location.active` is already of type ActiveParts.
                if (intent.data && isActiveParts(location.active)) {
                  location.active = Object.entries(intent.data.activeParts).reduce(
                    (acc: ActiveParts, [part, ids]) => {
                      const partMembers = new Set<string>();
                      (Array.isArray(acc[part]) ? (acc[part] as string[]) : [acc[part] as string]).forEach((id) =>
                        partMembers.add(id),
                      );
                      (Array.isArray(ids) ? ids : [ids]).forEach((id) => partMembers.delete(id));
                      acc[part] = Array.from(partMembers);
                      return acc;
                    },
                    { ...location.active },
                  );
                }
              });
              return { data: true };
            }

            // TODO(wittjosiah): Factor out.
            case NavigationAction.SET: {
              batch(() => {
                if (isActiveParts(intent.data?.activeParts)) {
                  location.active = intent.data!.activeParts;
                }
              });
              return { data: true };
            }

            case NavigationAction.ADJUST: {
              batch(() => {
                if (isAdjustTransaction(intent.data)) {
                  const nextActive = applyActiveAdjustment(location.active, intent.data);
                  location.active = nextActive;
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
