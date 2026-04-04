//
// Copyright 2023 DXOS.org
//

import React, {
  Fragment,
  type PropsWithChildren,
  type UIEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import { useAtomCapability, useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { useNode } from '@dxos/plugin-graph';
import { Main, type MainContentProps, useMediaQuery, useOnTransition } from '@dxos/react-ui';
import { DEFAULT_HORIZONTAL_SIZE, Stack, StackContext } from '@dxos/react-ui-stack';
import { mainPaddingTransitions, mx } from '@dxos/ui-theme';

import { useBreakpoints, useCompanions, useDeckState, useHoistStatusbar, useSelectedCompanion } from '../../hooks';
import { DeckCapabilities, getMode } from '../../types';
import { DeckOperation } from '../../operations';
import { calculateOverscroll, layoutAppliesTopbar } from '../../util';
import { fixedComplementarySidebarToggleStyles, fixedSidebarToggleStyles } from './fragments';
import {
  PlankRoot,
  PlankContainer,
  PlankComponent,
  type PlankComponentProps,
} from '../Plank';
import { ComplementarySidebar, Sidebar, ToggleComplementarySidebarButton, ToggleSidebarButton } from '../Sidebar';

import { ContentEmpty } from './ContentEmpty';
import { DeckMainProvider, type DeckMainContextValue } from './DeckMainContext';
import { StatusBar } from './StatusBar';
import { Banner } from './Banner';

export type { LayoutChangeRequest } from './DeckMainContext';

export type DeckMainRootProps = PropsWithChildren<DeckMainContextValue>;

/**
 * Headless root that provides DeckMain context.
 */
const DeckMainRoot = ({ children, ...context }: DeckMainRootProps) => {
  return <DeckMainProvider {...context}>{children}</DeckMainProvider>;
};

//
// ConnectedPlank
//

type ConnectedPlankProps = Pick<PlankComponentProps, 'layoutMode' | 'part' | 'path' | 'order' | 'active' | 'settings'> & {
  id?: string;
  companionVariant?: string;
};

const UNKNOWN_ID = 'unknown_id';

/**
 * Connected Plank that calls hooks and renders the radix-style Plank tree.
 * This is the bridge between DeckMain (which knows about framework hooks) and
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
    <PlankRoot
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
      <PlankContainer
        solo={props.part === 'solo'}
        companion={hasCompanion}
        encapsulate={!!props.settings?.encapsulatedPlanks}
      >
        <PlankComponent
          id={id}
          node={node}
          companioned={hasCompanion ? 'primary' : undefined}
          companions={hasCompanion ? [] : companions}
          {...props}
          {...(props.part === 'solo' ? { part: 'solo-primary' } : {})}
        />
        {hasCompanion && (
          <PlankComponent
            id={resolvedCompanionId}
            node={currentCompanion}
            primary={node}
            companions={companions}
            companioned='companion'
            {...props}
            {...(props.part === 'solo' ? { part: 'solo-companion' } : { order: (props.order ?? 0) + 1 })}
          />
        )}
      </PlankContainer>
    </PlankRoot>
  );
});

//
// DeckMain
//

export type DeckMainProps = {
  /** Callback invoked when the layout mode needs to change. */
  onLayoutChange: (request: LayoutChangeRequest) => void;
};

export const DeckMain = ({ onLayoutChange }: DeckMainProps) => {
  const settings = useAtomCapability(DeckCapabilities.Settings);
  const pluginManager = usePluginManager();
  const { state, deck, updateState } = useDeckState();
  const { sidebarState, complementarySidebarState, complementarySidebarPanel } = state;
  const { active, companionOpen, companionVariant, fullscreen, solo, plankSizing } = deck;
  const effectiveCompanionVariant = companionOpen ? companionVariant : undefined;
  const layoutMode = getMode(deck);
  const breakpoint = useBreakpoints();
  const topbar = layoutAppliesTopbar(breakpoint, layoutMode);
  const hoistStatusbar = useHoistStatusbar(breakpoint, layoutMode);

  const scrollLeftRef = useRef<number>(null);
  const deckRef = useRef<HTMLDivElement>(null);

  // Ensure the first plank is attended when the deck is first rendered.
  useEffect(() => {
    // NOTE: Not `useAttended` so that the layout component is not re-rendered when the attended list changes.
    const attention = pluginManager.capabilities.get(AttentionCapabilities.Attention);
    const attended = attention.getCurrent();
    const firstId = solo ?? active[0];
    if (attended.length === 0 && firstId) {
      // TODO(wittjosiah): Focusing the type button is a workaround.
      //   If the plank is directly focused on first load the focus ring appears.
      document.querySelector<HTMLElement>(`article[data-attendable-id="${firstId}"] button`)?.focus();
    }
  }, []);

  // Not using `breakpoint` to avoid firing when breakpoint changes between tablet and desktop.
  // `ssr: false` to avoid using fallback values and flashing into solo mode on startup.
  const [isNotMobile] = useMediaQuery('md');
  const shouldRevert = useRef(false);
  useEffect(() => {
    if (!isNotMobile && layoutMode === 'deck') {
      // NOTE: Not `useAttended` so that the layout component is not re-rendered when the attended list changes.
      const attention = pluginManager.capabilities.get(AttentionCapabilities.Attention);
      const attended = attention.getCurrent();
      shouldRevert.current = true;
      onLayoutChange({ subject: attended[0], mode: 'solo' });
    } else if (isNotMobile && layoutMode === 'solo' && shouldRevert.current) {
      onLayoutChange({ revert: true });
    }
    // NOTE: Using `layoutMode` instead of `deck` to avoid infinite loops caused by object reference changes.
  }, [isNotMobile, layoutMode, onLayoutChange]);

  // When deck is disabled in settings, set to solo mode if the current layout mode is deck.
  // TODO(thure): Applying this as an effect should be avoided over emitting the operation only when the setting changes.
  useEffect(() => {
    if (!settings?.enableDeck && layoutMode === 'deck') {
      onLayoutChange({ subject: active[0], mode: 'solo' });
    }
  }, [settings?.enableDeck, onLayoutChange, active, layoutMode]);

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
  useOnTransition(layoutMode, (mode) => mode !== 'deck', 'deck', restoreScroll);

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

  const handleNavigationSidebarStateChange = useCallback(
    (next: typeof sidebarState) => {
      updateState((s) => ({ ...s, sidebarState: next }));
    },
    [updateState],
  );

  const handleComplementarySidebarStateChange = useCallback(
    (next: typeof complementarySidebarState) => {
      updateState((s) => ({ ...s, complementarySidebarState: next }));
    },
    [updateState],
  );

  return (
    <DeckMainRoot
      settings={settings}
      pluginManager={pluginManager}
      layoutMode={layoutMode}
      state={state}
      deck={deck}
      updateState={updateState}
      onLayoutChange={onLayoutChange}
    >
      <Main.Root
        navigationSidebarState={fullscreen ? 'closed' : sidebarState}
        complementarySidebarState={fullscreen ? 'closed' : complementarySidebarState}
        onNavigationSidebarStateChange={handleNavigationSidebarStateChange}
        onComplementarySidebarStateChange={handleComplementarySidebarStateChange}
      >
        {/* Left sidebar. */}
        <Sidebar />

        {/* Right sidebar. */}
        <ComplementarySidebar current={complementarySidebarPanel} />

        {/* Dialog overlay to dismiss dialogs. */}
        <Main.Overlay />

        {/* No content. */}
        {isEmpty && (
          <Main.Content bounce handlesFocus classNames={mainPosition}>
            <ContentEmpty />
          </Main.Content>
        )}

        {/* Solo/deck mode. */}
        {!isEmpty && (
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
                orientation='horizontal'
                size='contain'
                itemsCount={itemsCount - 1}
                classNames={[
                  'absolute inset-y-(--main-spacing) -inset-w-px h-[calc(100%-2*var(--main-spacing))]',
                  mainPaddingTransitions,
                ]}
                style={padding}
                onScroll={handleScroll}
                ref={deckRef}
              >
                {active.map((entryId) => (
                  <Fragment key={entryId}>
                    <PlankSeparator order={order[entryId] - 1} encapsulate={!!settings?.enableDeck} />
                    <ConnectedPlank
                      id={entryId}
                      companionVariant={effectiveCompanionVariant}
                      part='deck'
                      order={order[entryId]}
                      active={active}
                      layoutMode={layoutMode}
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
                  companionVariant={effectiveCompanionVariant}
                  part='solo'
                  layoutMode={layoutMode}
                  settings={settings}
                />
              </StackContext.Provider>
            </div>
          </Main.Content>
        )}

        {/* Topbar. */}
        {topbar && <Banner variant='topbar' />}

        {/* Status bar. */}
        {hoistStatusbar && <StatusBar showHints={settings?.showHints} />}
      </Main.Root>
    </DeckMainRoot>
  );
};

const PlankSeparator = ({ order, encapsulate }: { order: number; encapsulate?: boolean }) =>
  order > 0 ? (
    <span
      role='separator'
      className={mx('row-span-2 bg-deck-surface', encapsulate ? 'w-0' : 'w-4')}
      style={{ gridColumn: order }}
    />
  ) : null;

export { DeckMainRoot };

/**
 * Radix-style composite DeckMain component.
 */
export const DeckMainParts = {
  Root: DeckMainRoot,
};
