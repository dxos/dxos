//
// Copyright 2026 DXOS.org
//

import React, { Fragment, memo, type UIEvent, useCallback, useEffect, useMemo, useRef } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { useNode } from '@dxos/plugin-graph';
import { Main, type MainContentProps, useOnTransition } from '@dxos/react-ui';
import { DEFAULT_HORIZONTAL_SIZE, Stack, StackContext } from '@dxos/react-ui-stack';
import { mainPaddingTransitions, mx } from '@dxos/ui-theme';

import { useBreakpoints, useCompanions, useDeckState, useHoistStatusbar, useSelectedCompanion } from '../../hooks';
import { DeckOperation } from '../../operations';
import { calculateOverscroll, layoutAppliesTopbar } from '../../util';
import { Plank, type PlankComponentProps } from '../Plank';
import { ToggleComplementarySidebarButton, ToggleSidebarButton } from '../Sidebar';

import { useDeckContext } from './DeckRoot';
import { ContentEmpty } from './ContentEmpty';
import { fixedComplementarySidebarToggleStyles, fixedSidebarToggleStyles } from './fragments';

const DECK_VIEWPORT_NAME = 'DeckViewport';

/**
 * Deck viewport that renders the main content area.
 * Handles empty state, deck mode (horizontal stack), and solo mode.
 */
export const DeckViewport = () => {
  const { deck, state, settings, layoutMode } = useDeckContext(DECK_VIEWPORT_NAME);
  const { active, companionOpen, companionVariant, fullscreen, solo, plankSizing } = deck;
  const { sidebarState, complementarySidebarState } = state;
  const effectiveCompanionVariant = companionOpen ? companionVariant : undefined;
  const breakpoint = useBreakpoints();
  const topbar = layoutAppliesTopbar(breakpoint, layoutMode);
  const hoistStatusbar = useHoistStatusbar(breakpoint, layoutMode);
  const scrollLeftRef = useRef<number>(null);
  const deckRef = useRef<HTMLDivElement>(null);

  /**
   * Clear scroll restoration state if the window is resized.
   */
  const handleResize = useCallback(() => {
    scrollLeftRef.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  const restoreScroll = useCallback(() => {
    if (deckRef.current && scrollLeftRef.current != null) {
      deckRef.current.scrollLeft = scrollLeftRef.current;
    }
  }, []);
  useOnTransition(layoutMode, (mode) => mode !== 'multi', 'multi', restoreScroll);

  /**
   * Save scroll position as the user scrolls.
   */
  const handleScroll = useCallback(
    (event: UIEvent) => {
      if (!solo && event.currentTarget === event.target) {
        scrollLeftRef.current = (event.target as HTMLDivElement).scrollLeft;
      }
    },
    [solo],
  );

  const isEmpty = !solo && active.length === 0;

  const padding = useMemo(() => {
    if (!solo && settings?.overscroll === 'centering') {
      return calculateOverscroll(active.length);
    }
    return {};
  }, [solo, settings?.overscroll, deck]);

  const mainPosition = useMemo(
    () => [
      'grid !top-[env(safe-area-inset-top)]',
      topbar && '!top-[calc(env(safe-area-inset-top)+var(--dx-rail-size))]',
      hoistStatusbar && 'lg:bottom-(--dx-statusbar-size)',
    ],
    [topbar, hoistStatusbar],
  );

  const { order, itemsCount }: { order: Record<string, number>; itemsCount: number } = useMemo(() => {
    return active.reduce(
      (acc: { order: Record<string, number>; itemsCount: number }, entryId) => {
        acc.order[entryId] = acc.itemsCount + 1;
        acc.itemsCount += companionOpen ? 3 : 2;
        return acc;
      },
      { order: {}, itemsCount: 0 },
    );
  }, [active, companionOpen]);

  if (isEmpty) {
    return (
      <Main.Content bounce handlesFocus classNames={mainPosition}>
        <ContentEmpty />
      </Main.Content>
    );
  }

  return (
    <Main.Content
      bounce
      handlesFocus
      classNames={mainPosition}
      style={
        {
          '--main-spacing': settings?.encapsulatedPlanks ? '0.75rem' : '0',
          '--dx-main-sidebar-width':
            sidebarState === 'expanded'
              ? 'var(--dx-nav-sidebar-size)'
              : sidebarState === 'collapsed'
                ? 'var(--dx-l0-size)'
                : '0',
          '--dx-main-complementary-width':
            complementarySidebarState === 'expanded'
              ? 'var(--dx-complementary-sidebar-size)'
              : complementarySidebarState === 'collapsed'
                ? 'var(--dx-rail-size)'
                : '0',
          '--dx-main-content-first-width': `${plankSizing[active[0] ?? 'never'] ?? DEFAULT_HORIZONTAL_SIZE}rem`,
          '--dx-main-content-last-width': `${plankSizing[active[(active.length ?? 1) - 1] ?? 'never'] ?? DEFAULT_HORIZONTAL_SIZE}rem`,
        } as MainContentProps['style']
      }
    >
      {/* Deck mode. */}
      <div
        role='none'
        className={!solo ? 'relative bg-deck-surface overflow-hidden' : 'sr-only'}
        {...(solo && { inert: true })}
      >
        {!topbar && !fullscreen && <ToggleSidebarButton classNames={fixedSidebarToggleStyles} />}
        {!topbar && !fullscreen && (
          <ToggleComplementarySidebarButton classNames={fixedComplementarySidebarToggleStyles} />
        )}
        <Stack
          classNames={[
            'absolute inset-y-(--main-spacing) -inset-w-px h-[calc(100%-2*var(--main-spacing))]',
            mainPaddingTransitions,
          ]}
          itemsCount={itemsCount - 1}
          size='contain'
          orientation='horizontal'
          style={padding}
          onScroll={handleScroll}
          ref={deckRef}
        >
          {active.map((entryId) => (
            <Fragment key={entryId}>
              <PlankSeparator order={order[entryId] - 1} encapsulate={!!settings?.encapsulatedPlanks} />
              <ConnectedPlank
                id={entryId}
                part='multi'
                active={active}
                order={order[entryId]}
                layoutMode={layoutMode}
                companionVariant={effectiveCompanionVariant}
                settings={settings}
              />
            </Fragment>
          ))}
        </Stack>
      </div>

      {/* Solo mode. */}
      <div
        role='none'
        className={solo ? 'relative overflow-hidden bg-deck-surface' : 'sr-only'}
        {...(!solo && { inert: true })}
      >
        {!topbar && !fullscreen && <ToggleSidebarButton classNames={fixedSidebarToggleStyles} />}
        {!topbar && !fullscreen && (
          <ToggleComplementarySidebarButton classNames={fixedComplementarySidebarToggleStyles} />
        )}
        <StackContext.Provider
          value={{
            orientation: 'horizontal',
            size: 'contain',
            rail: true,
          }}
        >
          <ConnectedPlank
            id={solo}
            part='solo'
            layoutMode={layoutMode}
            companionVariant={effectiveCompanionVariant}
            settings={settings}
          />
        </StackContext.Provider>
      </div>
    </Main.Content>
  );
};

DeckViewport.displayName = DECK_VIEWPORT_NAME;

//
// ConnectedPlank
//

const UNKNOWN_ID = 'unknown_id';

type ConnectedPlankProps = Pick<PlankComponentProps, 'layoutMode' | 'part' | 'settings'> &
  Partial<Pick<PlankComponentProps, 'path' | 'order' | 'active'>> & {
    id?: string;
    companionVariant?: string;
  };

/**
 * Connected Plank that calls hooks and renders the radix-style Plank tree.
 * This is the bridge between DeckViewport (which knows about framework hooks) and
 * the pure Plank components (which receive everything via context).
 */
const ConnectedPlank = memo(({ id = UNKNOWN_ID, companionVariant, ...props }: ConnectedPlankProps) => {
  const { graph } = useAppGraph();
  const { invokePromise } = useOperationInvoker();
  const { state, deck } = useDeckState();
  const node = useNode(graph, id);
  const companions = useCompanions(id);
  const { companionId } = useSelectedCompanion(companions, companionVariant);
  const resolvedCompanionId = companionVariant ? companionId : undefined;
  const currentCompanion = companions.find(({ id }) => id === resolvedCompanionId);
  const hasCompanion = !!(resolvedCompanionId && currentCompanion);

  const handleAdjust = useCallback(
    (plankId: string, type: DeckOperation.PartAdjustment) => {
      if (type === 'close') {
        if (props.part === 'complementary') {
          return invokePromise(LayoutOperation.UpdateComplementary, { state: 'collapsed' });
        }
        return invokePromise(LayoutOperation.Close, { subject: [plankId] });
      }
      return invokePromise(DeckOperation.Adjust, { type, id: plankId });
    },
    [invokePromise, props.part],
  );

  const handleResize = useCallback(
    (plankId: string, size: number) => invokePromise(DeckOperation.UpdatePlankSize, { id: plankId, size }),
    [invokePromise],
  );

  const handleScrollIntoView = useCallback(
    (subject?: string) => invokePromise(LayoutOperation.ScrollIntoView, { subject }),
    [invokePromise],
  );

  const handleChangeCompanion = useCallback(
    (companion: string | null) => invokePromise(DeckOperation.ChangeCompanion, { companion }),
    [invokePromise],
  );

  return (
    <Plank.Root
      graph={graph}
      layoutMode={props.layoutMode}
      part={props.part}
      settings={props.settings}
      popoverAnchorId={state.popoverAnchorId}
      scrollIntoView={state.scrollIntoView}
      plankSizing={deck.plankSizing}
      onAdjust={handleAdjust}
      onResize={handleResize}
      onScrollIntoView={handleScrollIntoView}
      onChangeCompanion={handleChangeCompanion}
    >
      <Plank.Content
        solo={props.part === 'solo'}
        companion={hasCompanion}
        encapsulate={!!props.settings?.encapsulatedPlanks}
      >
        {/* TODO(burdon): Destructure props rather than passing everything to Root and Component. */}
        <Plank.Component
          id={id}
          node={node}
          companioned={hasCompanion ? 'primary' : undefined}
          companions={hasCompanion ? [] : companions}
          {...props}
          {...(props.part === 'solo' ? { part: 'solo-primary' } : {})}
        />
        {hasCompanion && (
          <Plank.Component
            id={resolvedCompanionId}
            node={currentCompanion}
            primary={node}
            companions={companions}
            companioned='companion'
            {...props}
            {...(props.part === 'solo' ? { part: 'solo-companion' } : { order: (props.order ?? 0) + 1 })}
          />
        )}
      </Plank.Content>
    </Plank.Root>
  );
});

//
// PlankSeparator
//

const PlankSeparator = ({ order, encapsulate }: { order: number; encapsulate?: boolean }) =>
  order > 0 ? (
    <span
      role='separator'
      className={mx('row-span-2 bg-deck-surface', encapsulate ? 'w-0' : 'w-4')}
      style={{ gridColumn: order }}
    />
  ) : null;
