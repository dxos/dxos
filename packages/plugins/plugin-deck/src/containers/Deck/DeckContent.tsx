//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren, useCallback, useEffect, useState } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import { DRAWER_DEFAULT_HEIGHT, Main, useTranslation } from '@dxos/react-ui';

import { useBreakpoints } from '#hooks';
import { meta } from '#meta';

import { layoutAppliesTopbar } from '../../util/index.ts';
import { ComplementarySidebar, Sidebar } from '../Sidebar/index.ts';
import { Banner } from './Banner.tsx';
import { useDeckContext } from './DeckRoot.tsx';

const DECK_CONTENT_NAME = 'DeckContent';

export type DeckContentProps = PropsWithChildren;

export const DeckContent = ({ children }: DeckContentProps) => {
  const {
    state: {
      sidebarState,
      complementarySidebarState,
      complementarySidebarPanel,
      drawerState,
      drawerHeight,
      fullscreen,
    },
    deck: { active },
    updateState,
    pluginManager,
  } = useDeckContext(DECK_CONTENT_NAME);
  const { t } = useTranslation(meta.profile.key);
  // Controlled height would drop every mid-drag move, so the drag is mirrored locally until it ends.
  const [liveHeight, setLiveHeight] = useState<number>();
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

  const handleNavigationSidebarStateChange = useCallback(
    (next: typeof sidebarState) => {
      updateState((state) => ({ ...state, sidebarState: next }));
    },
    [updateState],
  );

  const handleComplementarySidebarStateChange = useCallback(
    (next: typeof complementarySidebarState) => {
      updateState((state) => ({ ...state, complementarySidebarState: next }));
    },
    [updateState],
  );

  const handleDrawerStateChange = useCallback(
    (next: NonNullable<typeof drawerState>) => {
      updateState((state) => ({ ...state, drawerState: next }));
    },
    [updateState],
  );

  // Persist only at drag end; every intermediate move would otherwise write the KVS store.
  const handleDrawerHeightChangeEnd = useCallback(
    (next: number) => {
      updateState((state) => ({ ...state, drawerHeight: next }));
      setLiveHeight(undefined);
    },
    [updateState],
  );

  return (
    <Main.Root
      navigationSidebarState={fullscreen ? 'closed' : sidebarState}
      complementarySidebarState={fullscreen ? 'closed' : complementarySidebarState}
      drawerState={fullscreen ? 'closed' : (drawerState ?? 'closed')}
      drawerHeight={liveHeight ?? drawerHeight ?? DRAWER_DEFAULT_HEIGHT}
      onNavigationSidebarStateChange={handleNavigationSidebarStateChange}
      onComplementarySidebarStateChange={handleComplementarySidebarStateChange}
      onDrawerStateChange={handleDrawerStateChange}
      onDrawerHeightChange={setLiveHeight}
      onDrawerHeightChangeEnd={handleDrawerHeightChangeEnd}
    >
      <Sidebar />
      <ComplementarySidebar current={complementarySidebarPanel} />
      <Main.Drawer label={t('drawer.label')}>
        <Surface.Surface type={AppSurface.Drawer} limit={1} />
      </Main.Drawer>
      <Main.Overlay />
      {children}
      {topbar && <Banner variant='topbar' />}
    </Main.Root>
  );
};

DeckContent.displayName = DECK_CONTENT_NAME;
