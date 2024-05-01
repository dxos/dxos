//
// Copyright 2023 DXOS.org
//

import { Sidebar as MenuIcon } from '@phosphor-icons/react';
import React from 'react';

import { useGraph } from '@braneframe/plugin-graph';
import {
  Surface,
  type Toast as ToastSchema,
  type Location,
  isActiveParts,
  type ActiveParts,
  type PartIdentifier,
} from '@dxos/app-framework';
import { Button, Main, Dialog, useTranslation, DensityProvider, Popover, Status } from '@dxos/react-ui';
import { Deck } from '@dxos/react-ui-deck';
import { fixedInsetFlexLayout, getSize } from '@dxos/react-ui-theme';

import { ContentEmpty } from './ContentEmpty';
import { Fallback } from './Fallback';
import { useLayout } from './LayoutContext';
import { Toast } from './Toast';
import { DECK_PLUGIN } from '../meta';

export type AttentionState = {
  attended: Set<string>;
};

export type DeckLayoutProps = {
  fullscreen: boolean;
  showHintsFooter: boolean;
  toasts: ToastSchema[];
  onDismissToast: (id: string) => void;
  location: Location;
  attention: AttentionState;
};

export const NAV_ID = 'NavTree';

export const firstSidebarId = (active: Location['active']): string | undefined =>
  isActiveParts(active) ? (Array.isArray(active.sidebar) ? active.sidebar[0] : active.sidebar) : undefined;

export const firstComplementaryId = (active: Location['active']): string | undefined =>
  isActiveParts(active)
    ? Array.isArray(active.complementary)
      ? active.complementary[0]
      : active.complementary
    : undefined;

const PlankLoading = () => {
  return (
    <div role='none' className='grid bs-[100dvh] place-items-center'>
      <Status indeterminate aria-label='Initializing' />
    </div>
  );
};

export const DeckLayout = ({
  fullscreen,
  showHintsFooter,
  toasts,
  onDismissToast,
  attention,
  location,
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
  } = context;
  const { t } = useTranslation(DECK_PLUGIN);
  const { graph } = useGraph();

  const activeParts: ActiveParts = isActiveParts(location.active)
    ? Object.keys(location.active).length < 1
      ? { sidebar: NAV_ID }
      : location.active
    : { sidebar: NAV_ID, main: [location.active].filter(Boolean) as string[] };
  const sidebarId = firstSidebarId(activeParts);
  const sidebarNode = sidebarId ? graph.findNode(sidebarId) : null;
  const sidebarAvailable = sidebarId === NAV_ID || !!sidebarNode;
  const complementaryId = firstComplementaryId(activeParts);
  const complementaryNode = complementaryId ? graph.findNode(complementaryId) : null;
  const complementaryAvailable = complementaryId === NAV_ID || !!complementaryNode;

  return fullscreen ? (
    <div className={fixedInsetFlexLayout}>
      <Surface role='main' limit={1} fallback={Fallback} />
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
          data={{ activeNode: graph.findNode(Array.from(attention.attended)[0]) }}
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
        {/* Left navigation sidebar. */}
        <Main.NavigationSidebar>
          {sidebarId ? (
            sidebarId === NAV_ID ? (
              <Surface
                role='navigation'
                data={{
                  part: ['sidebar', 0, 1] satisfies PartIdentifier,
                  popoverAnchorId,
                }}
                limit={1}
              />
            ) : (
              <Surface
                role='article'
                data={{
                  object: graph.findNode(sidebarId),
                  part: ['sidebar', 0, 1] satisfies PartIdentifier,
                  popoverAnchorId,
                }}
                limit={1}
              />
            )
          ) : null}
        </Main.NavigationSidebar>

        {/* Notch */}
        <Main.Notch>
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

        <Main.ComplementarySidebar>
          {complementaryId === NAV_ID ? (
            <Surface
              role='navigation'
              data={{
                part: ['complementary', 0, 1] satisfies PartIdentifier,
                popoverAnchorId,
              }}
              limit={1}
            />
          ) : complementaryNode ? (
            <Surface
              role='article'
              data={{
                object: complementaryNode.data,
                part: ['complementary', 0, 1] satisfies PartIdentifier,
                popoverAnchorId,
              }}
              limit={1}
            />
          ) : null}
        </Main.ComplementarySidebar>

        {/* Dialog overlay to dismiss dialogs. */}
        <Main.Overlay />

        {/* Main content surface. */}
        <Deck.Root>
          {(Array.isArray(activeParts.main) ? activeParts.main.filter(Boolean).length > 0 : activeParts.main) ? (
            (Array.isArray(activeParts.main) ? activeParts.main : [activeParts.main])
              .filter(Boolean)
              .map((id, index, main) => {
                const node = graph.findNode(id);
                return (
                  <Deck.Plank key={id}>
                    {id === NAV_ID ? (
                      <Surface
                        role='navigation'
                        data={{
                          part: ['main', index, main.length] satisfies PartIdentifier,
                          popoverAnchorId,
                        }}
                        limit={1}
                      />
                    ) : node ? (
                      <Surface
                        role='article'
                        data={{
                          object: node.data,
                          part: ['main', index, main.length] satisfies PartIdentifier,
                          popoverAnchorId,
                        }}
                        limit={1}
                        fallback={<PlankLoading />}
                      />
                    ) : (
                      <PlankLoading />
                    )}
                  </Deck.Plank>
                );
              })
          ) : (
            <ContentEmpty />
          )}
        </Deck.Root>

        {/* Status info. */}
        {/* TODO(burdon): Currently obscured by complementary sidebar. */}
        <div role='none' aria-label={t('status label')} className='fixed bottom-0 right-0 z-[1]'>
          <Surface role='status' limit={1} />
        </div>

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
          <DensityProvider density='fine'>
            <Dialog.Overlay blockAlign={dialogBlockAlign}>
              <Surface role='dialog' data={dialogContent} />
            </Dialog.Overlay>
          </DensityProvider>
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
