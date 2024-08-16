//
// Copyright 2023 DXOS.org
//

import { Placeholder, Plus, Sidebar as MenuIcon } from '@phosphor-icons/react';
import React, { Fragment, useEffect, useState, useMemo, useCallback } from 'react';

import { type Node, useGraph, ACTION_GROUP_TYPE, ACTION_TYPE } from '@braneframe/plugin-graph';
import {
  type Attention,
  LayoutAction,
  NavigationAction,
  SLUG_COLLECTION_INDICATOR,
  SLUG_PATH_SEPARATOR,
  Surface,
  usePlugin,
  useIntentDispatcher,
  firstIdInPart,
  openIds,
  indexInPart,
  partLength,
  type Intent,
  type LayoutCoordinate,
  type LayoutParts,
  type Toast as ToastSchema,
  type LayoutPart,
  type LayoutEntry,
} from '@dxos/app-framework';
import {
  Button,
  Dialog,
  Main,
  Popover,
  Status,
  Tooltip,
  toLocalizedString,
  useMediaQuery,
  useTranslation,
} from '@dxos/react-ui';
import { createAttendableAttributes } from '@dxos/react-ui-attention';
import { Deck, deckGrid, PlankHeading, Plank, plankHeadingIconProps } from '@dxos/react-ui-deck';
import { TextTooltip } from '@dxos/react-ui-text-tooltip';
import { descriptionText, fixedInsetFlexLayout, getSize, mx } from '@dxos/react-ui-theme';

import { ContentEmpty } from './ContentEmpty';
import { Fallback } from './Fallback';
import { useLayout } from './LayoutContext';
import { Toast } from './Toast';
import { useNode, useNodes } from '../hooks';
import { DECK_PLUGIN } from '../meta';
import { type Overscroll } from '../types';

export type DeckLayoutProps = {
  showHintsFooter: boolean;
  overscroll: Overscroll;
  flatDeck?: boolean;
  toasts: ToastSchema[];
  onDismissToast: (id: string) => void;
  layoutParts: LayoutParts;
  attention: Attention;
  // TODO(Zan): Deprecate slots.
  slots?: {
    wallpaper?: { classNames?: string };
    deck?: { classNames?: string };
    plank?: { classNames?: string };
  };
};

export const NAV_ID = 'NavTree';
export const SURFACE_PREFIX = 'surface:';

const PlankLoading = () => {
  return (
    <div role='none' className='grid bs-[100dvh] place-items-center row-span-2'>
      <Status indeterminate aria-label='Initializing' />
    </div>
  );
};

const PlankContentError = ({ error }: { error?: Error }) => {
  const { t } = useTranslation(DECK_PLUGIN);
  return (
    <div role='none' className='grid place-items-center row-span-2'>
      <p
        role='alert'
        className={mx(
          descriptionText,
          // TODO(burdon): Factor out common styles for all dialogs.
          'overflow-hidden break-words',
          'place-self-center border border-dashed border-neutral-400/50 rounded-lg text-center p-8 font-normal text-lg',
        )}
      >
        {error ? error.toString() : t('error fallback message')}
      </p>
    </div>
  );
};

const PlankError = ({
  layoutCoordinate,
  id,
  node,
  error,
  flatDeck,
}: {
  layoutCoordinate: LayoutCoordinate;
  id: string;
  node?: Node;
  error?: Error;
  flatDeck?: boolean;
}) => {
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    setTimeout(() => setTimedOut(true), 5e3);
  }, []);
  return (
    <>
      <NodePlankHeading
        node={node}
        id={id}
        layoutPart={layoutCoordinate.part}
        pending={!timedOut}
        flatDeck={flatDeck}
      />
      {timedOut ? <PlankContentError error={error} /> : <PlankLoading />}
    </>
  );
};

const NodePlankHeading = ({
  node,
  id,
  layoutParts,
  layoutPart,
  layoutEntry,
  popoverAnchorId,
  pending,
  flatDeck,
}: {
  node?: Node;
  id?: string;
  layoutParts?: LayoutParts;
  layoutPart?: LayoutPart;
  layoutEntry?: LayoutEntry;
  popoverAnchorId?: string;
  pending?: boolean;
  flatDeck?: boolean;
}) => {
  const { t } = useTranslation(DECK_PLUGIN);
  const { graph } = useGraph();
  const Icon = node?.properties?.icon ?? Placeholder;
  const label = pending
    ? t('pending heading')
    : toLocalizedString(node?.properties?.label ?? ['plank heading fallback label', { ns: DECK_PLUGIN }], t);
  const dispatch = useIntentDispatcher();
  const ActionRoot = node && popoverAnchorId === `dxos.org/ui/${DECK_PLUGIN}/${node.id}` ? Popover.Anchor : Fragment;
  const [isNotMobile] = useMediaQuery('md');

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      // Load actions for the node.
      node && graph.actions(node);
    });

    return () => cancelAnimationFrame(frame);
  }, [node]);

  // NOTE(Zan): Node ids may now contain a path like `${space}:${id}~comments`
  const attendableId = id?.split(SLUG_PATH_SEPARATOR).at(0);

  const layoutCoordinate = layoutPart !== undefined && id !== undefined ? { part: layoutPart, entryId: id } : undefined;
  const index = indexInPart(layoutParts, layoutCoordinate);
  const length = partLength(layoutParts, layoutPart);

  const canIncrementStart =
    layoutPart === 'main' && index !== undefined && index > 0 && length !== undefined && length > 1;
  const canIncrementEnd = layoutPart === 'main' && index !== undefined && index < length - 1 && length !== undefined;

  return (
    <PlankHeading.Root {...((layoutPart !== 'main' || !flatDeck) && { classNames: 'pie-1' })}>
      <ActionRoot>
        {node ? (
          <PlankHeading.ActionsMenu
            Icon={Icon}
            attendableId={attendableId}
            triggerLabel={t('actions menu label')}
            actions={graph.actions(node)}
            onAction={(action) =>
              typeof action.data === 'function' && action.data?.({ node: action as Node, caller: DECK_PLUGIN })
            }
          >
            <Surface role='menu-footer' data={{ object: node.data }} />
          </PlankHeading.ActionsMenu>
        ) : (
          <PlankHeading.Button>
            <span className='sr-only'>{label}</span>
            <Icon {...plankHeadingIconProps} />
          </PlankHeading.Button>
        )}
      </ActionRoot>
      <TextTooltip text={label} onlyWhenTruncating>
        <PlankHeading.Label attendableId={node?.id} {...(pending && { classNames: 'fg-description' })}>
          {label}
        </PlankHeading.Label>
      </TextTooltip>
      {node && layoutPart !== 'complementary' && (
        // TODO(Zan): What are we doing with layout coordinate here?
        <Surface role='navbar-end' direction='inline-reverse' data={{ object: node.data }} />
      )}
      {/* NOTE(thure): Pinning & unpinning are temporarily disabled */}
      <PlankHeading.Controls
        capabilities={{
          solo: (layoutPart === 'solo' || layoutPart === 'main') && isNotMobile,
          incrementStart: canIncrementStart,
          incrementEnd: canIncrementEnd,
        }}
        isSolo={layoutPart === 'solo'}
        onClick={(eventType) => {
          if (!layoutPart) {
            return;
          }

          if (eventType === 'solo') {
            return dispatch(
              [
                {
                  action: NavigationAction.ADJUST,
                  data: { type: eventType, layoutCoordinate: { part: 'main', entryId: id } },
                },
              ],

              //   // Scroll into view if unsoloing.
              //   // TODO(Zan): Dispatch this from the layout intent handler.
              //   layoutPart === 'solo'
              //     ? {
              //         action: LayoutAction.SCROLL_INTO_VIEW,
              //         data: { id: node?.id },
              //       }
              //     : undefined,
              // ].filter((x) => x !== undefined) as Intent[],
            );
          }

          // TODO(Zan): Update this to use the new layout actions.
          return dispatch(
            eventType === 'close'
              ? layoutPart === 'complementary'
                ? {
                    action: LayoutAction.SET_LAYOUT,
                    data: {
                      element: 'complementary',
                      state: false,
                    },
                  }
                : {
                    action: NavigationAction.CLOSE,
                    data: {
                      activeParts: {
                        complementary: [`${id}${SLUG_PATH_SEPARATOR}comments${SLUG_COLLECTION_INDICATOR}`],
                        [layoutPart]: [id],
                      },
                    },
                  }
              : { action: NavigationAction.ADJUST, data: { type: eventType, layoutCoordinate } },
          );
        }}
        close={layoutCoordinate?.part === 'complementary' ? 'minify-end' : true}
      />
    </PlankHeading.Root>
  );
};

export const DeckLayout = ({
  showHintsFooter,
  toasts,
  onDismissToast,
  flatDeck,
  attention,
  layoutParts,
  slots,
  overscroll,
}: DeckLayoutProps) => {
  const context = useLayout();
  const {
    layoutMode,
    complementarySidebarOpen,
    dialogOpen,
    dialogContent,
    dialogBlockAlign,
    popoverOpen,
    popoverContent,
    popoverAnchorId,
    scrollIntoView,
  } = context;
  const { t } = useTranslation(DECK_PLUGIN);
  const { graph } = useGraph();

  // TODO(wittjosiah): Finding nodes in the graph should probably not be done at the top-level of layout.
  const sidebarNodeId = useMemo(() => firstIdInPart(layoutParts, 'sidebar'), [layoutParts]);
  const sidebarAvailable = useMemo(() => sidebarNodeId === NAV_ID, [sidebarNodeId]);

  const fullScreenSlug = useMemo(() => firstIdInPart(layoutParts, 'fullScreen'), [layoutParts]);
  const fullScreenNode = useNode(graph, fullScreenSlug);
  const fullScreenAvailable = useMemo(
    () => fullScreenSlug?.startsWith(SURFACE_PREFIX) || fullScreenSlug === NAV_ID || !!fullScreenNode,
    [fullScreenSlug, fullScreenNode],
  );

  const complementarySlug = useMemo(() => firstIdInPart(layoutParts, 'complementary'), [layoutParts]);
  const complementaryNode = useNode(graph, complementarySlug);
  const complementaryAvailable = useMemo(
    () => complementarySlug === NAV_ID || !!complementaryNode,
    [complementarySlug, complementaryNode],
  );
  const complementaryAttrs = useMemo(
    () => createAttendableAttributes(complementarySlug?.split(SLUG_PATH_SEPARATOR)[0] ?? 'never'),
    [complementarySlug],
  );

  // console.log('complementarySlug', complementarySlug);
  // console.log('complementaryNode', complementaryNode);
  // console.log('complementaryAvailable', complementaryAvailable);
  // console.log('complementaryAttrs', complementaryAttrs);

  const activeIds = useMemo(() => new Set<string>(openIds(layoutParts)), [layoutParts]);
  const mainIds = useMemo(() => layoutParts.main?.map(({ id }) => id), [layoutParts.main]);
  const mainNodes = useNodes(graph, mainIds);

  const soloIds = useMemo(() => layoutParts.solo?.map(({ id }) => id), [layoutParts.solo]);
  const soloNodes = useNodes(graph, soloIds);

  const searchEnabled = !!usePlugin('dxos.org/plugin/search');
  const dispatch = useIntentDispatcher();

  const navigationData = useMemo(
    () => ({
      popoverAnchorId,
      activeIds,
      attended: attention.attended,
    }),
    [popoverAnchorId, activeIds, attention.attended],
  );

  const activeId = useMemo(() => Array.from(attention.attended ?? [])[0], [attention.attended]);
  const activeNode = useNode(graph, activeId);

  const expandNode = useCallback(
    async (node: Node) => {
      await graph.expand(node, 'outbound', ACTION_GROUP_TYPE);
      await graph.expand(node, 'outbound', ACTION_TYPE);
    },
    [graph],
  );

  useEffect(() => {
    if (activeNode) {
      const frame = requestAnimationFrame(() => {
        void expandNode(activeNode);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [activeNode, expandNode]);

  useEffect(() => {
    if (complementaryNode) {
      const frame = requestAnimationFrame(() => {
        void expandNode(complementaryNode);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [complementaryNode, expandNode]);

  if (layoutMode === 'fullscreen' && fullScreenAvailable) {
    return (
      <div role='none' className={fixedInsetFlexLayout}>
        <Surface
          role='main'
          limit={1}
          fallback={Fallback}
          data={{
            active: fullScreenNode?.data,
            component: fullScreenSlug?.startsWith(SURFACE_PREFIX)
              ? fullScreenSlug.slice(SURFACE_PREFIX.length)
              : undefined,
          }}
        />
      </div>
    );
  }

  return (
    <Popover.Root
      modal
      open={!!(popoverAnchorId && popoverOpen)}
      onOpenChange={(nextOpen) => {
        if (nextOpen && popoverAnchorId) {
          context.popoverOpen = true;
        } else {
          context.popoverOpen = false;
          context.popoverAnchorId = undefined;
        }
      }}
    >
      <div role='none' className='sr-only'>
        <Surface role='document-title' data={{ activeNode }} limit={1} />
      </div>

      <Main.Root
        navigationSidebarOpen={sidebarAvailable && (context.sidebarOpen as boolean)}
        onNavigationSidebarOpenChange={(next) => (context.sidebarOpen = next)}
        {...(complementarySidebarOpen !== null && {
          complementarySidebarOpen: complementaryAvailable && (context.complementarySidebarOpen as boolean),
          onComplementarySidebarOpenChange: (next) => (context.complementarySidebarOpen = next),
        })}
      >
        {/* Notch */}
        <Main.Notch classNames='z-[21]'>
          <Surface role='notch-start' />
          <Button
            disabled={!sidebarAvailable}
            onClick={() => (context.sidebarOpen = !context.sidebarOpen)}
            variant='ghost'
            classNames='p-1'
          >
            <span className='sr-only'>{t('open navigation sidebar label')}</span>
            <MenuIcon weight='light' className={getSize(5)} />
          </Button>
          <Button
            disabled={!complementaryAvailable}
            onClick={() => (context.complementarySidebarOpen = !context.complementarySidebarOpen)}
            variant='ghost'
            classNames='p-1'
          >
            <span className='sr-only'>{t('open complementary sidebar label')}</span>
            <MenuIcon mirrored weight='light' className={getSize(5)} />
          </Button>
          <Surface role='notch-end' />
        </Main.Notch>

        {/* Sidebars */}
        <Main.NavigationSidebar>
          {sidebarNodeId === NAV_ID ? <Surface role='navigation' data={{ ...navigationData }} limit={1} /> : null}
        </Main.NavigationSidebar>

        <Main.ComplementarySidebar {...complementaryAttrs}>
          {complementarySlug === NAV_ID ? (
            <Surface role='navigation' data={{ ...navigationData }} limit={1} />
          ) : complementaryNode ? (
            <div role='none' className={mx(deckGrid, 'grid-cols-1 bs-full')}>
              <NodePlankHeading
                node={complementaryNode}
                id={complementarySlug!}
                layoutParts={layoutParts}
                layoutPart='complementary'
                popoverAnchorId={popoverAnchorId}
                flatDeck={flatDeck}
              />
              <Surface
                role='article'
                data={{ subject: complementaryNode.data, part: 'complementary', popoverAnchorId }}
                limit={1}
                fallback={PlankContentError}
                placeholder={<PlankLoading />}
              />
            </div>
          ) : null}
        </Main.ComplementarySidebar>

        {/* Dialog overlay to dismiss dialogs. */}
        <Main.Overlay />

        {/* Main content surface. */}
        {layoutMode === 'deck' && layoutParts.main && layoutParts.main.length > 0 && (
          <Main.Content bounce classNames={['grid', 'block-end-[--statusbar-size]']}>
            <div role='none' className='relative'>
              <Deck.Root
                overscroll={overscroll === 'centering'}
                classNames={mx(
                  'absolute inset-0',
                  !flatDeck && 'surface-deck',
                  slots?.wallpaper?.classNames,
                  slots?.deck?.classNames,
                )}
              >
                {layoutParts.main.map((layoutEntry, index, main) => {
                  // TODO(Zan): Switch this to the new layout coordinates once consumers can speak that.
                  const layoutCoordinate = {
                    part: 'main',
                    entryId: layoutEntry.id,
                  } satisfies LayoutCoordinate;

                  // TODO(Zan): Maybe we should load these into a map instead of searching every time.
                  const node = mainNodes.find((node) => node.id === layoutEntry.id);
                  const attendableAttrs = createAttendableAttributes(layoutEntry.id);
                  const isAlone = mainNodes.length === 1;
                  const boundary = index === 0 ? 'start' : index === main.length - 1 ? 'end' : undefined;

                  if (!node) {
                    return null;
                  }

                  const id = node.id;

                  return (
                    <Plank.Root key={id} boundary={isAlone ? undefined : boundary}>
                      <Plank.Content
                        {...attendableAttrs}
                        classNames={[!flatDeck && 'surface-base', slots?.plank?.classNames]}
                        scrollIntoViewOnMount={id === scrollIntoView}
                        suppressAutofocus={id === NAV_ID || !!node?.properties?.managesAutofocus}
                      >
                        {id === NAV_ID ? (
                          <Surface role='navigation' data={{ ...navigationData }} limit={1} />
                        ) : node ? (
                          <>
                            <NodePlankHeading
                              layoutPart='main'
                              layoutParts={layoutParts}
                              node={node}
                              id={id}
                              popoverAnchorId={popoverAnchorId}
                              flatDeck={flatDeck}
                            />
                            <Surface
                              role='article'
                              data={{
                                ...(layoutEntry.path
                                  ? { subject: node.data, path: layoutEntry.path }
                                  : { object: node.data }),
                                layoutCoordinate,
                                popoverAnchorId,
                              }}
                              limit={1}
                              fallback={PlankContentError}
                              placeholder={<PlankLoading />}
                            />
                          </>
                        ) : (
                          <PlankError layoutCoordinate={layoutCoordinate} id={id} flatDeck={flatDeck} />
                        )}
                      </Plank.Content>
                      {searchEnabled ? (
                        <div role='none' className='grid grid-rows-subgrid row-span-3'>
                          <Tooltip.Root>
                            <Tooltip.Trigger asChild>
                              <Button
                                data-testid='plankHeading.open'
                                variant='ghost'
                                classNames='p-1 w-fit'
                                onClick={() =>
                                  dispatch([
                                    {
                                      action: LayoutAction.SET_LAYOUT,
                                      data: {
                                        element: 'dialog',
                                        component: 'dxos.org/plugin/search/Dialog',
                                        dialogBlockAlign: 'start',
                                        subject: {
                                          action: NavigationAction.SET,
                                          position: 'add-after',
                                          layoutCoordinate,
                                        },
                                      },
                                    },
                                  ])
                                }
                              >
                                <span className='sr-only'>{t('insert plank label')}</span>
                                <Plus />
                              </Button>
                            </Tooltip.Trigger>
                            <Tooltip.Portal>
                              <Tooltip.Content side='bottom' classNames='z-[70]'>
                                {t('insert plank label')}
                              </Tooltip.Content>
                            </Tooltip.Portal>
                          </Tooltip.Root>
                          <Plank.ResizeHandle classNames='row-start-[toolbar-start] row-end-[content-end]' />
                        </div>
                      ) : (
                        <Plank.ResizeHandle classNames='row-span-3' />
                      )}
                    </Plank.Root>
                  );
                })}
              </Deck.Root>
            </div>
          </Main.Content>
        )}

        {/* Solo main content surface. */}
        {layoutMode === 'solo' && layoutParts.solo && layoutParts.solo.length > 0 && (
          <Main.Content bounce classNames={['grid', 'block-end-[--statusbar-size]']}>
            <div role='none' className='relative'>
              <Deck.Root
                overscroll={overscroll === 'centering'}
                classNames={mx(
                  'absolute inset-0',
                  !flatDeck && 'surface-deck',
                  slots?.wallpaper?.classNames,
                  slots?.deck?.classNames,
                )}
                solo={true}
              >
                {layoutParts.solo.map((layoutEntry, index) => {
                  // TODO(Zan): Switch this to the new layout coordinates once consumers can speak that.
                  const layoutCoordinate = {
                    part: 'solo',
                    entryId: layoutEntry.id,
                  } satisfies LayoutCoordinate;

                  // TODO(Zan): Maybe we should load these into a map instead of searching every time.
                  const node = soloNodes.find((node) => node.id === layoutEntry.id);
                  const attendableAttrs = createAttendableAttributes(layoutEntry.id);

                  if (!node) {
                    return null;
                  }

                  const id = node.id;

                  return (
                    <Plank.Root key={index}>
                      <Plank.Content
                        {...attendableAttrs}
                        classNames={[!flatDeck && 'surface-base', slots?.plank?.classNames]}
                        scrollIntoViewOnMount={id === scrollIntoView}
                        suppressAutofocus={id === NAV_ID || !!node?.properties?.managesAutofocus}
                      >
                        {id === NAV_ID ? (
                          <Surface role='navigation' data={{ ...navigationData }} limit={1} />
                        ) : node ? (
                          <>
                            <NodePlankHeading
                              layoutPart='solo'
                              layoutParts={layoutParts}
                              node={node}
                              id={id}
                              popoverAnchorId={popoverAnchorId}
                              flatDeck={flatDeck}
                            />
                            <Surface
                              role='article'
                              data={{
                                ...(layoutEntry.path
                                  ? { subject: node.data, path: layoutEntry.path }
                                  : { object: node.data }),
                                layoutCoordinate,
                                popoverAnchorId,
                              }}
                              limit={1}
                              fallback={PlankContentError}
                              placeholder={<PlankLoading />}
                            />
                          </>
                        ) : (
                          <PlankError layoutCoordinate={layoutCoordinate} id={id} flatDeck={flatDeck} />
                        )}
                      </Plank.Content>
                    </Plank.Root>
                  );
                })}
              </Deck.Root>
            </div>
          </Main.Content>
        )}

        {((layoutMode === 'solo' && (!layoutParts.solo || layoutParts.solo.length === 0)) ||
          (layoutMode === 'deck' && (!layoutParts.main || layoutParts.main.length === 0))) && (
          <Main.Content>
            <ContentEmpty />
          </Main.Content>
        )}

        {/* Note: This is not Main.Content */}
        <Main.Content role='none' classNames={['fixed inset-inline-0 block-end-0 z-[2]']}>
          <Surface role='status-bar' limit={1} />
        </Main.Content>

        {/* Help hints. */}
        {/* TODO(burdon): Make surface roles/names fully-qualified. */}
        {showHintsFooter && (
          <div className='fixed bottom-0 left-0 right-0 h-[32px] z-[1] flex justify-center'>
            <Surface role='hints' limit={1} />
          </div>
        )}

        {/* Global popovers. */}
        <Popover.Portal>
          <Popover.Content
            classNames='z-[60]'
            onEscapeKeyDown={() => {
              context.popoverOpen = false;
              context.popoverAnchorId = undefined;
            }}
          >
            <Popover.Viewport>
              <Surface role='popover' data={popoverContent} />
            </Popover.Viewport>
            <Popover.Arrow />
          </Popover.Content>
        </Popover.Portal>

        {/* Global dialog. */}
        <Dialog.Root open={dialogOpen} onOpenChange={(nextOpen) => (context.dialogOpen = nextOpen)}>
          <Dialog.Overlay blockAlign={dialogBlockAlign}>
            <Surface role='dialog' data={dialogContent} />
          </Dialog.Overlay>
        </Dialog.Root>

        {/* Global toasts. */}
        {toasts?.map((toast) => (
          <Toast
            {...toast}
            key={toast.id}
            onOpenChange={(open) => {
              if (!open) {
                onDismissToast(toast.id);
              }

              return open;
            }}
          />
        ))}
      </Main.Root>
    </Popover.Root>
  );
};
