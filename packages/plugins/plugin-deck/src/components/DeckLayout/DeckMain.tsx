//
// Copyright 2023 DXOS.org
//

import { untracked } from '@preact/signals-core';
import React, { Fragment, type UIEvent, useCallback, useEffect, useMemo, useRef } from 'react';

import {
  Capabilities,
  LayoutAction,
  createIntent,
  useCapability,
  useIntentDispatcher,
  usePluginManager,
} from '@dxos/app-framework';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { Main, type MainProps, useMediaQuery, useOnTransition } from '@dxos/react-ui';
import { DEFAULT_HORIZONTAL_SIZE, Stack, StackContext } from '@dxos/react-ui-stack';
import { mainPaddingTransitions, mx } from '@dxos/react-ui-theme';

import { DeckCapabilities } from '../../capabilities';
import { useBreakpoints, useHoistStatusbar } from '../../hooks';
import { meta } from '../../meta';
import { type DeckSettingsProps, getMode } from '../../types';
import { calculateOverscroll, layoutAppliesTopbar } from '../../util';
import { fixedComplementarySidebarToggleStyles, fixedSidebarToggleStyles } from '../fragments';
import { Plank } from '../Plank';
import { ComplementarySidebar, Sidebar, ToggleComplementarySidebarButton, ToggleSidebarButton } from '../Sidebar';

import { ContentEmpty } from './ContentEmpty';
import { StatusBar } from './StatusBar';
import { Topbar } from './Topbar';

export const DeckMain = () => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const settings = useCapability(Capabilities.SettingsStore).getStore<DeckSettingsProps>(meta.id)?.value;
  const context = useCapability(DeckCapabilities.MutableDeckState);
  const { sidebarState, complementarySidebarState, complementarySidebarPanel, deck } = context;
  const { active, activeCompanions, fullscreen, solo, plankSizing } = deck;
  const breakpoint = useBreakpoints();
  const layoutMode = getMode(deck);
  const topbar = layoutAppliesTopbar(breakpoint, layoutMode);
  const hoistStatusbar = useHoistStatusbar(breakpoint, layoutMode);
  const pluginManager = usePluginManager();

  const scrollLeftRef = useRef<number>(null);
  const deckRef = useRef<HTMLDivElement>(null);

  // Ensure the first plank is attended when the deck is first rendered.
  useEffect(() => {
    // NOTE: Not `useAttended` so that the layout component is not re-rendered when the attended list changes.
    const attended = untracked(() => {
      const attention = pluginManager.context.getCapability(AttentionCapabilities.Attention);
      return attention.current;
    });
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
    if (!isNotMobile && getMode(deck) === 'deck') {
      // NOTE: Not `useAttended` so that the layout component is not re-rendered when the attended list changes.
      const attended = untracked(() => {
        const attention = pluginManager.context.getCapability(AttentionCapabilities.Attention);
        return attention.current;
      });

      shouldRevert.current = true;
      void dispatch(
        createIntent(LayoutAction.SetLayoutMode, { part: 'mode', subject: attended[0], options: { mode: 'solo' } }),
      );
    } else if (isNotMobile && getMode(deck) === 'solo' && shouldRevert.current) {
      void dispatch(createIntent(LayoutAction.SetLayoutMode, { part: 'mode', options: { revert: true } }));
    }
  }, [isNotMobile, deck, dispatch]);

  // When deck is disabled in settings, set to solo mode if the current layout mode is deck.
  // TODO(thure): Applying this as an effect should be avoided over emitting the intent only when the setting changes.
  useEffect(() => {
    if (settings?.enableDeck && layoutMode === 'deck') {
      void dispatch(
        createIntent(LayoutAction.SetLayoutMode, { part: 'mode', subject: active[0], options: { mode: 'solo' } }),
      );
    }
  }, [settings?.enableDeck, dispatch, active, layoutMode]);

  /**
   * Clear scroll restoration state if the window is resized
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
   * Save scroll position as the user scrolls
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
      'grid !block-start-[env(safe-area-inset-top)]',
      topbar && '!block-start-[calc(env(safe-area-inset-top)+var(--rail-size))]',
      hoistStatusbar && 'lg:block-end-[--statusbar-size]',
    ],
    [topbar, hoistStatusbar],
  );

  const { order, itemsCount }: { order: Record<string, number>; itemsCount: number } = useMemo(() => {
    return active.reduce(
      (acc: { order: Record<string, number>; itemsCount: number }, entryId) => {
        acc.order[entryId] = acc.itemsCount + 1;
        acc.itemsCount += activeCompanions?.[entryId] ? 3 : 2;
        return acc;
      },
      { order: {}, itemsCount: 0 },
    );
  }, [active, activeCompanions]);

  return (
    <Main.Root
      navigationSidebarState={fullscreen ? 'closed' : context.sidebarState}
      onNavigationSidebarStateChange={(next) => (context.sidebarState = next)}
      complementarySidebarState={fullscreen ? 'closed' : context.complementarySidebarState}
      onComplementarySidebarStateChange={(next) => (context.complementarySidebarState = next)}
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
              '--dx-main-sidebarWidth':
                sidebarState === 'expanded'
                  ? 'var(--nav-sidebar-size)'
                  : sidebarState === 'collapsed'
                    ? 'var(--l0-size)'
                    : '0',
              '--dx-main-complementaryWidth':
                complementarySidebarState === 'expanded'
                  ? 'var(--complementary-sidebar-size)'
                  : complementarySidebarState === 'collapsed'
                    ? 'var(--rail-size)'
                    : '0',
              '--dx-main-contentFirstWidth': `${plankSizing[active[0] ?? 'never'] ?? DEFAULT_HORIZONTAL_SIZE}rem`,
              '--dx-main-contentLastWidth': `${plankSizing[active[(active.length ?? 1) - 1] ?? 'never'] ?? DEFAULT_HORIZONTAL_SIZE}rem`,
            } as MainProps['style']
          }
        >
          <div
            role='none'
            className={!solo ? 'relative bg-deckSurface overflow-hidden' : 'sr-only'}
            {...(solo && { inert: true })}
          >
            {!topbar && !fullscreen && <ToggleSidebarButton classNames={fixedSidebarToggleStyles} />}
            {!topbar && !fullscreen && (
              <ToggleComplementarySidebarButton classNames={fixedComplementarySidebarToggleStyles} />
            )}
            <Stack
              ref={deckRef}
              orientation='horizontal'
              size='contain'
              itemsCount={itemsCount - 1}
              classNames={[
                'absolute inset-block-[--main-spacing] -inset-inline-px bs-[calc(100%-2*var(--main-spacing))]',
                mainPaddingTransitions,
              ]}
              style={padding}
              onScroll={handleScroll}
            >
              {active.map((entryId) => (
                <Fragment key={entryId}>
                  <PlankSeparator order={order[entryId] - 1} encapsulate={!!settings?.enableDeck} />
                  <Plank
                    id={entryId}
                    companionId={activeCompanions?.[entryId]}
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
          <div
            role='none'
            className={solo ? 'relative overflow-hidden bg-deckSurface' : 'sr-only'}
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
              <Plank
                id={solo}
                companionId={solo ? activeCompanions?.[solo] : undefined}
                part='solo'
                layoutMode={layoutMode}
                settings={settings}
              />
            </StackContext.Provider>
          </div>
        </Main.Content>
      )}

      {/* Topbar. */}
      {topbar && <Topbar />}

      {/* Status bar. */}
      {hoistStatusbar && <StatusBar showHints={settings?.showHints} />}
    </Main.Root>
  );
};

const PlankSeparator = ({ order, encapsulate }: { order: number; encapsulate?: boolean }) =>
  order > 0 ? (
    <span
      role='separator'
      className={mx('row-span-2 bg-deckSurface', encapsulate ? 'is-0' : 'is-4')}
      style={{ gridColumn: order }}
    />
  ) : null;
