//
// Copyright 2026 DXOS.org
//

import React, {
  Fragment,
  memo,
  type PropsWithChildren,
  type UIEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import { addEventListener } from '@dxos/async';
import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { invariant } from '@dxos/invariant';
import { useNode } from '@dxos/plugin-graph';
import { Main, type MainContentProps, useOnTransition } from '@dxos/react-ui';
import { DEFAULT_HORIZONTAL_SIZE, Stack, StackContext } from '@dxos/react-ui-stack';
import { mainPaddingTransitions, mx } from '@dxos/ui-theme';

import { useBreakpoints, useCompanions, useDeckState, useHoistStatusbar, useSelectedCompanion } from '../../hooks';
import { DeckOperation } from '../../operations';
import { calculateOverscroll, layoutAppliesTopbar } from '../../util';
import { Plank, PlankRootProps, type PlankComponentProps } from '../Plank';
import {
  ToggleComplementarySidebarButton as NativeToggleComplementarySidebarButton,
  ToggleSidebarButton as NativeToggleSidebarButton,
} from '../Sidebar';

import { useDeckContext } from './DeckRoot';
import { getMode } from '../../types';

const DECK_VIEWPORT_NAME = 'DeckViewport';

//
// DeckViewport
//

export type DeckViewportProps = PropsWithChildren;

/**
 * Deck viewport that renders the main content area and sets CSS variables for plank sizing.
 */
export const DeckViewport = ({ children }: DeckViewportProps) => {
  const {
    deck: { active, solo, plankSizing },
    state: { sidebarState, complementarySidebarState },
    settings,
    layoutMode,
  } = useDeckContext(DECK_VIEWPORT_NAME);

  const breakpoint = useBreakpoints();
  const topbar = layoutAppliesTopbar(breakpoint, layoutMode);
  const hoistStatusbar = useHoistStatusbar(breakpoint, layoutMode);

  const mainClasses = useMemo(
    () => [
      'grid top-[env(safe-area-inset-top)]!',
      topbar && 'top-[calc(env(safe-area-inset-top)+var(--dx-rail-size))]!',
      hoistStatusbar && 'lg:bottom-(--dx-statusbar-size)',
    ],
    [topbar, hoistStatusbar],
  );

  if (!solo && active.length === 0) {
    return (
      <Main.Content bounce handlesFocus classNames={mainClasses}>
        <DeckContentEmpty />
      </Main.Content>
    );
  }

  return (
    <Main.Content
      bounce
      handlesFocus
      classNames={mainClasses}
      style={
        {
          '--main-spacing': settings?.encapsulatedPlanks ? '0.75rem' : '0',
          '--main-sidebar-width':
            sidebarState === 'expanded'
              ? 'var(--dx-nav-sidebar-size)'
              : sidebarState === 'collapsed'
                ? 'var(--dx-l0-size)'
                : '0',
          '--main-complementary-width':
            complementarySidebarState === 'expanded'
              ? 'var(--dx-complementary-sidebar-size)'
              : complementarySidebarState === 'collapsed'
                ? 'var(--dx-rail-size)'
                : '0',
          '--main-content-first-width': `${plankSizing[active[0] ?? 'never'] ?? DEFAULT_HORIZONTAL_SIZE}rem`,
          '--main-content-last-width': `${plankSizing[active[(active.length ?? 1) - 1] ?? 'never'] ?? DEFAULT_HORIZONTAL_SIZE}rem`,
        } as MainContentProps['style']
      }
    >
      {children}
    </Main.Content>
  );
};

DeckViewport.displayName = DECK_VIEWPORT_NAME;

//
// DeckMultiMode
//

/**
 * Multi-plank horizontal scrolling layout.
 */
export const DeckMultiMode = () => {
  const {
    deck: { active, companionOpen, companionVariant, fullscreen },
    settings,
    layoutMode,
  } = useDeckContext('DeckMultiMode');
  const effectiveCompanionVariant = companionOpen ? companionVariant : undefined;
  const breakpoint = useBreakpoints();
  const topbar = layoutAppliesTopbar(breakpoint, layoutMode);
  const deckRef = useRef<HTMLDivElement>(null);

  /** Clear scroll restoration state if the window is resized. */
  const scrollLeftRef = useRef<number>(null);
  useEffect(
    () =>
      addEventListener(window, 'resize', () => {
        scrollLeftRef.current = null;
      }),
    [],
  );

  const restoreScroll = useCallback(() => {
    if (deckRef.current && scrollLeftRef.current != null) {
      deckRef.current.scrollLeft = scrollLeftRef.current;
    }
  }, []);

  useOnTransition(layoutMode, (mode) => mode !== 'multi', 'multi', restoreScroll);

  /** Save scroll position as the user scrolls. */
  const handleScroll = useCallback((event: UIEvent) => {
    if (event.currentTarget === event.target) {
      scrollLeftRef.current = (event.target as HTMLDivElement).scrollLeft;
    }
  }, []);

  // Create order map.
  const { order, itemsCount } = useMemo(() => {
    return active.reduce(
      (acc: { order: Record<string, number>; itemsCount: number }, entryId) => {
        acc.order[entryId] = acc.itemsCount + 1;
        acc.itemsCount += companionOpen ? 3 : 2;
        return acc;
      },
      { order: {}, itemsCount: 0 },
    );
  }, [active, companionOpen]);

  const padding = useMemo(
    () => (settings?.overscroll === 'centering' ? calculateOverscroll(active.length) : {}),
    [settings?.overscroll, active.length],
  );

  return (
    <div role='none' className='relative bg-deck-surface overflow-hidden'>
      <DeckSidebarToggles topbar={topbar} fullscreen={fullscreen} />
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
            <PlankContainer
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
  );
};

//
// DeckSoloMode
//

/**
 * Single-plank layout with optional companion.
 */
export const DeckSoloMode = () => {
  const { deck, settings, layoutMode } = useDeckContext('DeckSoloMode');
  const { companionOpen, companionVariant, fullscreen, solo } = deck;
  const effectiveCompanionVariant = companionOpen ? companionVariant : undefined;
  const breakpoint = useBreakpoints();
  const topbar = layoutAppliesTopbar(breakpoint, layoutMode);
  invariant(solo);

  return (
    <div role='none' className='relative overflow-hidden bg-deck-surface'>
      <DeckSidebarToggles topbar={topbar} fullscreen={fullscreen} />
      <StackContext.Provider
        value={{
          orientation: 'horizontal',
          size: 'contain',
          rail: true,
        }}
      >
        <PlankContainer
          id={solo}
          part='solo'
          layoutMode={layoutMode}
          companionVariant={effectiveCompanionVariant}
          settings={settings}
        />
      </StackContext.Provider>
    </div>
  );
};

//
// SidebarToggles
//

const sidebarToggleStyles = 'h-(--dx-rail-item) w-(--dx-rail-item) absolute bottom-2 z-[1] !bg-deck-surface lg:hidden';

const ToggleSidebarButton = () => <NativeToggleSidebarButton classNames={mx(sidebarToggleStyles, 'left-2')} />;
const ToggleComplementarySidebarButton = () => (
  <NativeToggleComplementarySidebarButton classNames={mx(sidebarToggleStyles, 'right-2')} />
);

const DeckSidebarToggles = ({ topbar, fullscreen }: { topbar: boolean; fullscreen: boolean }) => {
  if (topbar || fullscreen) {
    return null;
  }

  return (
    <>
      <ToggleSidebarButton />
      <ToggleComplementarySidebarButton />
    </>
  );
};

//
// ContentEmpty
//

const DeckContentEmpty = () => {
  const breakpoint = useBreakpoints();
  const { deck } = useDeckState();
  const layoutMode = getMode(deck);
  const topbar = layoutAppliesTopbar(breakpoint, layoutMode);
  return (
    <div
      role='none'
      className='grid place-items-center p-8 relative bg-deck-surface'
      data-testid='layoutPlugin.firstRunMessage'
    >
      <Surface.Surface role='keyshortcuts' />
      {!topbar && <ToggleSidebarButton />}
    </div>
  );
};

//
// PlankSeparator
//

const PlankSeparator = ({ order, encapsulate }: { order: number; encapsulate?: boolean }) =>
  order > 0 && (
    <span
      role='separator'
      className={mx('row-span-2 bg-deck-surface', encapsulate ? 'w-0' : 'w-4')}
      style={{ gridColumn: order }}
    />
  );

//
// PlankContainer
//

type PlankContainerProps = Pick<PlankRootProps, 'layoutMode' | 'part' | 'settings'> &
  Pick<PlankComponentProps, 'id'> &
  Partial<Pick<PlankComponentProps, 'path' | 'order' | 'active'>> & {
    companionVariant?: string;
  };

/**
 * Connected Plank that calls hooks and renders the radix-style Plank tree.
 * This is the bridge between DeckViewport (which knows about framework hooks) and
 * the pure Plank components (which receive everything via context).
 */
const PlankContainer = memo(({ id, layoutMode, part, settings, companionVariant, ...props }: PlankContainerProps) => {
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
        if (part === 'complementary') {
          return invokePromise(LayoutOperation.UpdateComplementary, { state: 'collapsed' });
        } else {
          return invokePromise(LayoutOperation.Close, { subject: [plankId] });
        }
      } else {
        return invokePromise(DeckOperation.Adjust, { type, id: plankId });
      }
    },
    [invokePromise, part],
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
      layoutMode={layoutMode}
      part={part}
      settings={settings}
      popoverAnchorId={state.popoverAnchorId}
      scrollIntoView={state.scrollIntoView}
      plankSizing={deck.plankSizing}
      onAdjust={handleAdjust}
      onResize={handleResize}
      onScrollIntoView={handleScrollIntoView}
      onChangeCompanion={handleChangeCompanion}
    >
      <Plank.Content solo={part === 'solo'} companion={hasCompanion} encapsulate={!!settings?.encapsulatedPlanks}>
        <Plank.Component
          id={id}
          node={node}
          companioned={hasCompanion ? 'primary' : undefined}
          companions={hasCompanion ? [] : companions}
          {...(part === 'solo' ? { part: 'solo-primary' } : { part })}
          {...props}
        />
        {hasCompanion && (
          <Plank.Component
            id={resolvedCompanionId}
            node={currentCompanion}
            companions={companions}
            companioned='companion'
            primary={node}
            {...(part === 'solo' ? { part: 'solo-companion' } : { part, order: (props.order ?? 0) + 1 })}
            {...props}
          />
        )}
      </Plank.Content>
    </Plank.Root>
  );
});
