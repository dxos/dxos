//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren, useCallback, useEffect, useRef } from 'react';

import { AttentionCapabilities } from '@dxos/plugin-attention/types';
import { Main, useMediaQuery } from '@dxos/react-ui';

import { useBreakpoints, useHoistStatusbar } from '#hooks';

import { layoutAppliesTopbar } from '../../util';
import { ComplementarySidebar, Sidebar } from '../Sidebar';
import { Banner } from './Banner';
import { useDeckContext } from './DeckRoot';
import { StatusBar } from './StatusBar';

const DECK_CONTENT_NAME = 'DeckContent';

export type DeckContentProps = PropsWithChildren;

export const DeckContent = ({ children }: DeckContentProps) => {
  const {
    state: { sidebarState, complementarySidebarState, complementarySidebarPanel },
    deck: { active, fullscreen, solo },
    updateState,
    layoutMode,
    settings,
    pluginManager,
    onLayoutChange,
  } = useDeckContext(DECK_CONTENT_NAME);
  const breakpoint = useBreakpoints();
  const topbar = layoutAppliesTopbar(breakpoint, layoutMode);
  const hoistStatusbar = useHoistStatusbar(breakpoint, layoutMode);

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
    if (!isNotMobile && layoutMode === 'multi') {
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
    if (!settings?.enableDeck && layoutMode === 'multi') {
      onLayoutChange({ subject: active[0], mode: 'solo' });
    }
  }, [settings?.enableDeck, onLayoutChange, active, layoutMode]);

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
    <Main.Root
      navigationSidebarState={fullscreen ? 'closed' : sidebarState}
      complementarySidebarState={fullscreen ? 'closed' : complementarySidebarState}
      onNavigationSidebarStateChange={handleNavigationSidebarStateChange}
      onComplementarySidebarStateChange={handleComplementarySidebarStateChange}
    >
      <Sidebar />
      <ComplementarySidebar current={complementarySidebarPanel} />
      <Main.Overlay />
      {children}
      {topbar && <Banner variant='topbar' />}
      {hoistStatusbar && <StatusBar showHints={settings?.showHints} />}
    </Main.Root>
  );
};

DeckContent.displayName = DECK_CONTENT_NAME;
