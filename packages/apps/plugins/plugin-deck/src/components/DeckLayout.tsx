//
// Copyright 2023 DXOS.org
//

import { Placeholder, Plus, Sidebar as MenuIcon } from '@phosphor-icons/react';
import React, { Fragment, useEffect, useState } from 'react';

import { type Graph, type Node, useGraph } from '@braneframe/plugin-graph';
import {
  activeIds as getActiveIds,
  type ActiveParts,
  type Attention,
  isActiveParts,
  LayoutAction,
  type Location,
  NavigationAction,
  type PartIdentifier,
  SLUG_COLLECTION_INDICATOR,
  SLUG_PATH_SEPARATOR,
  Surface,
  type Toast as ToastSchema,
  usePlugin,
  useIntentDispatcher,
} from '@dxos/app-framework';
import { Button, Dialog, Main, Popover, Status, Tooltip, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Deck, deckGrid, PlankHeading, Plank, plankHeadingIconProps, useAttendable } from '@dxos/react-ui-deck';
import { TextTooltip } from '@dxos/react-ui-text-tooltip';
import { descriptionText, fixedInsetFlexLayout, getSize, mx } from '@dxos/react-ui-theme';

import { ContentEmpty } from './ContentEmpty';
import { Fallback } from './Fallback';
import { useLayout } from './LayoutContext';
import { Toast } from './Toast';
import { DECK_PLUGIN } from '../meta';

export type DeckLayoutProps = {
  showHintsFooter: boolean;
  toasts: ToastSchema[];
  onDismissToast: (id: string) => void;
  location: Location;
  attention: Attention;
  slots?: {
    wallpaper?: {
      classNames?: string;
    };
    deck?: {
      classNames?: string;
    };
    plank?: {
      classNames?: string;
    };
  };
};

export const NAV_ID = 'NavTree';

export const firstSidebarId = (active: Location['active']): string | undefined =>
  isActiveParts(active) ? (Array.isArray(active.sidebar) ? active.sidebar[0] : active.sidebar) : undefined;

export const firstFullscreenId = (active: Location['active']): string | undefined =>
  isActiveParts(active) ? (Array.isArray(active.fullScreen) ? active.fullScreen[0] : active.fullScreen) : undefined;

export const firstComplementaryId = (active: Location['active']): string | undefined =>
  isActiveParts(active)
    ? Array.isArray(active.complementary)
      ? active.complementary[0]
      : active.complementary
    : undefined;

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
          'place-self-center border border-dashed border-neutral-400/50 rounded-lg text-center p-8 font-normal text-lg',
        )}
      >
        {error ? error.toString() : t('error fallback message')}
      </p>
    </div>
  );
};

const PlankError = ({
  part,
  slug,
  node,
  error,
}: {
  part: PartIdentifier;
  slug: string;
  node?: Node;
  error?: Error;
}) => {
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    setTimeout(() => setTimedOut(true), 5e3);
  }, []);
  return (
    <>
      <NodePlankHeading node={node} part={part} slug={slug} pending={!timedOut} />
      {timedOut ? <PlankContentError error={error} /> : <PlankLoading />}
    </>
  );
};

const complementaryPart = ['complementary', 0, 1] satisfies PartIdentifier;
const sidebarPart = ['sidebar', 0, 1] satisfies PartIdentifier;

const NodePlankHeading = ({
  node,
  part,
  slug,
  popoverAnchorId,
  pending,
}: {
  node?: Node;
  part: PartIdentifier;
  slug: string;
  popoverAnchorId?: string;
  pending?: boolean;
}) => {
  const { t } = useTranslation(DECK_PLUGIN);
  const Icon = node?.properties?.icon ?? Placeholder;
  const label = pending
    ? t('pending heading')
    : toLocalizedString(node?.properties?.label ?? ['plank heading fallback label', { ns: DECK_PLUGIN }], t);
  const dispatch = useIntentDispatcher();
  const ActionRoot = node && popoverAnchorId === `dxos.org/ui/${DECK_PLUGIN}/${node.id}` ? Popover.Anchor : Fragment;
  return (
    <PlankHeading.Root {...(part[0] !== 'main' && { classNames: 'pie-1' })}>
      <ActionRoot>
        {node ? (
          <PlankHeading.ActionsMenu
            Icon={Icon}
            attendableId={node.id}
            triggerLabel={t('actions menu label')}
            actions={node.actions()}
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
      {node && part[0] !== 'complementary' && (
        <Surface role='navbar-end' direction='inline-reverse' data={{ object: node.data, part }} />
      )}
      {/* NOTE(thure): Pinning & unpinning are temporarily disabled */}
      <PlankHeading.Controls
        part={part}
        increment={part[0] === 'main'}
        // pin={part[0] === 'sidebar' ? 'end' : part[0] === 'complementary' ? 'start' : 'both'}
        onClick={({ type, part }) =>
          dispatch(
            type === 'close'
              ? part[0] === 'complementary'
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
                        complementary: `${slug}${SLUG_PATH_SEPARATOR}comments${SLUG_COLLECTION_INDICATOR}`,
                        [part[0]]: slug,
                      },
                    },
                  }
              : { action: NavigationAction.ADJUST, data: { type, part } },
          )
        }
        close={part[0] === 'complementary' ? 'minify-end' : true}
      />
    </PlankHeading.Root>
  );
};

const resolveNodeFromSlug = (graph: Graph, slug?: string): { node: Node; path?: string } | undefined => {
  if (!slug) {
    return undefined;
  }
  const [id, ...path] = slug.split(SLUG_PATH_SEPARATOR);
  const node = graph.findNode(id);
  if (!node) {
    return undefined;
  } else if (path.length > 0) {
    return { node, path: path.join(SLUG_PATH_SEPARATOR) };
  } else {
    return { node };
  }
};

export const DeckLayout = ({
  showHintsFooter,
  toasts,
  onDismissToast,
  attention,
  location,
  slots,
}: DeckLayoutProps) => {
  const context = useLayout();
  const {
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

  const activeParts: ActiveParts = isActiveParts(location.active)
    ? Object.keys(location.active).length < 1
      ? { sidebar: NAV_ID }
      : location.active
    : { sidebar: NAV_ID, main: [location.active].filter(Boolean) as string[] };
  const sidebarSlug = firstSidebarId(activeParts);
  const sidebarNode = resolveNodeFromSlug(graph, sidebarSlug);
  const sidebarAvailable = sidebarSlug === NAV_ID || !!sidebarNode;
  const fullScreenSlug = firstFullscreenId(activeParts);
  const fullScreenNode = resolveNodeFromSlug(graph, fullScreenSlug);
  const fullScreenAvailable = fullScreenSlug === NAV_ID || !!fullScreenNode;
  const complementarySlug = firstComplementaryId(activeParts);
  const complementaryNode = resolveNodeFromSlug(graph, complementarySlug);
  const complementaryAvailable = complementarySlug === NAV_ID || !!complementaryNode;
  const complementaryAttrs = useAttendable(complementarySlug?.split(SLUG_PATH_SEPARATOR)[0] ?? 'never');
  const activeIds = getActiveIds(location.active);
  const searchEnabled = !!usePlugin('dxos.org/plugin/search');
  const dispatch = useIntentDispatcher();
  const navigationData = {
    popoverAnchorId,
    activeIds,
    attended: attention.attended,
  };

  return fullScreenAvailable ? (
    <div role='none' className={fixedInsetFlexLayout}>
      <Surface role='main' limit={1} fallback={Fallback} data={{ active: fullScreenNode?.node.data }} />
    </div>
  ) : (
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
        <Surface
          role='document-title'
          data={{ activeNode: graph.findNode(Array.from(attention.attended ?? [])[0]) }}
          limit={1}
        />
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
          {sidebarSlug === NAV_ID ? (
            <Surface role='navigation' data={{ part: sidebarPart, ...navigationData }} limit={1} />
          ) : sidebarNode ? (
            <>
              <NodePlankHeading
                node={sidebarNode.node}
                slug={sidebarSlug!}
                part={sidebarPart}
                popoverAnchorId={popoverAnchorId}
              />
              <Surface
                role='article'
                data={{
                  ...(sidebarNode.path
                    ? { subject: sidebarNode.node.data, path: sidebarNode.path }
                    : { object: sidebarNode.node.data }),
                  part: sidebarPart,
                  popoverAnchorId,
                }}
                limit={1}
                fallback={PlankContentError}
                placeholder={<PlankLoading />}
              />
            </>
          ) : null}
        </Main.NavigationSidebar>
        <Main.ComplementarySidebar {...complementaryAttrs}>
          {complementarySlug === NAV_ID ? (
            <Surface role='navigation' data={{ part: complementaryPart, ...navigationData }} limit={1} />
          ) : complementaryNode ? (
            <div role='none' className={mx(deckGrid, 'grid-cols-1 bs-full')}>
              <NodePlankHeading
                node={complementaryNode.node}
                slug={complementarySlug!}
                part={complementaryPart}
                popoverAnchorId={popoverAnchorId}
              />
              <Surface
                role='article'
                data={{
                  ...(complementaryNode.path
                    ? { subject: complementaryNode.node.data, path: complementaryNode.path }
                    : { object: complementaryNode.node.data }),
                  part: complementaryPart,
                  popoverAnchorId,
                }}
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
        {(Array.isArray(activeParts.main) ? activeParts.main.filter(Boolean).length > 0 : activeParts.main) ? (
          <Main.Content bounce classNames={['grid', 'block-end-[--statusbar-size]']}>
            <div role='none' className='relative'>
              {slots?.wallpaper?.classNames && (
                <div className={mx('absolute inset-0 z-0', slots.wallpaper.classNames)} />
              )}
              <Deck.Root classNames={mx('absolute inset-0', slots?.deck?.classNames)}>
                {(Array.isArray(activeParts.main) ? activeParts.main : [activeParts.main])
                  .filter(Boolean)
                  .map((id, index, main) => {
                    const node = resolveNodeFromSlug(graph, id);
                    const part = ['main', index, main.length] satisfies PartIdentifier;
                    const attendableAttrs = useAttendable(id);
                    return (
                      <Plank.Root key={id}>
                        <Plank.Content
                          {...attendableAttrs}
                          classNames={slots?.plank?.classNames}
                          scrollIntoViewOnMount={id === scrollIntoView}
                          suppressAutofocus={id === NAV_ID || !!node?.node?.properties?.managesAutofocus}
                        >
                          {id === NAV_ID ? (
                            <Surface role='navigation' data={{ part, ...navigationData }} limit={1} />
                          ) : node ? (
                            <>
                              <NodePlankHeading
                                node={node.node}
                                slug={id}
                                part={part}
                                popoverAnchorId={popoverAnchorId}
                              />
                              <Surface
                                role='article'
                                data={{
                                  ...(node.path
                                    ? { subject: node.node.data, path: node.path }
                                    : { object: node.node.data }),
                                  part,
                                  popoverAnchorId,
                                }}
                                limit={1}
                                fallback={PlankContentError}
                                placeholder={<PlankLoading />}
                              />
                            </>
                          ) : (
                            <PlankError part={part} slug={id} />
                          )}
                        </Plank.Content>
                        {searchEnabled ? (
                          <div role='none' className='grid grid-rows-subgrid row-span-3'>
                            <Tooltip.Root>
                              <Tooltip.Trigger asChild>
                                <Button
                                  data-testid='plankHeading.open'
                                  variant='ghost'
                                  classNames='p-1'
                                  onClick={() =>
                                    dispatch([
                                      {
                                        action: LayoutAction.SET_LAYOUT,
                                        data: {
                                          element: 'dialog',
                                          component: 'dxos.org/plugin/search/Dialog',
                                          dialogBlockAlign: 'start',
                                          subject: { action: NavigationAction.SET, position: 'add-after', part },
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
        ) : (
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
