//
// Copyright 2023 DXOS.org
//

import React, { memo, useCallback, useEffect, useRef } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { useNode } from '@dxos/plugin-graph';
import { Main, useMediaQuery } from '@dxos/react-ui';

import { useBreakpoints, useCompanions, useDeckState, useHoistStatusbar, useSelectedCompanion } from '../../hooks';
import { DeckOperation } from '../../operations';
import { layoutAppliesTopbar } from '../../util';
import { Plank, type PlankComponentProps } from '../Plank';
import { useDeckContext } from './DeckRoot';
import { ComplementarySidebar, Sidebar } from '../Sidebar';
import { DeckViewport } from './DeckViewport';
import { StatusBar } from './StatusBar';
import { Banner } from './Banner';

//
// ConnectedPlank
//

const UNKNOWN_ID = 'unknown_id';

export type ConnectedPlankProps = Pick<PlankComponentProps, 'layoutMode' | 'part' | 'settings'> &
  Partial<Pick<PlankComponentProps, 'path' | 'order' | 'active'>> & {
    id?: string;
    companionVariant?: string;
  };

/**
 * Connected Plank that calls hooks and renders the radix-style Plank tree.
 * This is the bridge between DeckContent (which knows about framework hooks) and
 * the pure Plank components (which receive everything via context).
 */
export const ConnectedPlank = memo(({ id = UNKNOWN_ID, companionVariant, ...props }: ConnectedPlankProps) => {
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
// DeckContent
//

export const DeckContent = () => {
  const { settings, pluginManager, state, deck, updateState, layoutMode, onLayoutChange } = useDeckContext('DeckContent');
  const { sidebarState, complementarySidebarState, complementarySidebarPanel } = state;
  const { active, fullscreen, solo } = deck;
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
      {/* Left sidebar. */}
      <Sidebar />

      {/* Right sidebar. */}
      <ComplementarySidebar current={complementarySidebarPanel} />

      {/* Dialog overlay to dismiss dialogs. */}
      <Main.Overlay />

      <DeckViewport />

      {/* Topbar. */}
      {topbar && <Banner variant='topbar' />}

      {/* Status bar. */}
      {hoistStatusbar && <StatusBar showHints={settings?.showHints} />}
    </Main.Root>
  );
};
