//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren, useCallback, useEffect } from 'react';

import { AttentionCapabilities } from '@dxos/plugin-attention';
import { Main } from '@dxos/react-ui';

import { useBreakpoints } from '#hooks';

import { layoutAppliesTopbar } from '../../util';
import { ComplementarySidebar, Sidebar } from '../Sidebar';
import { Banner } from './Banner';
import { useDeckContext } from './DeckRoot';

const DECK_CONTENT_NAME = 'DeckContent';

export type DeckContentProps = PropsWithChildren;

export const DeckContent = ({ children }: DeckContentProps) => {
  const {
    state: { sidebarState, complementarySidebarState, complementarySidebarPanel, fullscreen },
    deck: { active },
    updateState,
    pluginManager,
  } = useDeckContext(DECK_CONTENT_NAME);
  const breakpoint = useBreakpoints();
  const topbar = layoutAppliesTopbar(breakpoint, !!fullscreen);

  // Ensure the first plank is attended when the deck is first rendered.
  useEffect(() => {
    // NOTE: Not `useAttended` so that the layout component is not re-rendered when the attended list changes.
    const attention = pluginManager.capabilities.get(AttentionCapabilities.Attention);
    const attended = attention.getCurrent();
    const firstId = active[0];
    if (attended.length === 0 && firstId) {
      // TODO(wittjosiah): Focusing the type button is a workaround.
      //   If the plank is directly focused on first load the focus ring appears.
      document.querySelector<HTMLElement>(`article[data-attendable-id="${firstId}"] button`)?.focus();
    }
  }, []);

  // TODO(url-deck-redesign): B3 replaces the previous state-mutating mobile "solo-ify" effect (which
  //   forced `active` down to the attended plank below the `md` breakpoint, with revert-on-return) and
  //   the `enableDeck`-disabled effect with a render-level derived presentation — mobile scroll-snap
  //   and single-plank-when-disabled — that never mutates deck state.

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
    </Main.Root>
  );
};

DeckContent.displayName = DECK_CONTENT_NAME;
