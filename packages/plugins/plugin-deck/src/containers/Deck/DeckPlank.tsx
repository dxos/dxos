//
// Copyright 2026 DXOS.org
//

import { useFocusFinders } from '@fluentui/react-tabster';
import React, { type KeyboardEvent, memo, useCallback, useEffect, useRef } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { type ThemedClassName, Splitter } from '@dxos/react-ui';

import { Companion, Plank } from '#components';
import { useCompanionSplit } from '#hooks';
import { type LayoutMode, type ResolvedPart, type Settings } from '#types';

import { PlankCompanionControls, PlankControls } from './PlankControls';
import { PlankErrorFallback, PlankLoading } from './PlankFallback';
import { useDeckPlank } from './useDeckPlank';

export type DeckPlankProps = ThemedClassName<{
  id: string;
  part: ResolvedPart;
  layoutMode: LayoutMode;
  active?: string[];
  /** Whether the companion pane should be shown for this plank (gated further by attention in multi-mode). */
  companionShown?: boolean;
  settings?: Settings.Settings;
  path?: string[];
}>;

/**
 * Connected deck plank: resolves the node, companions, actions and operation handlers via
 * {@link useDeckPlank} and renders the presentational {@link Plank} — wrapped in a {@link Splitter}
 * beside a {@link Companion} when a companion is open. Replaces the legacy
 * `PlankContainer`/`PlankComponent`/`PlankHeading` tree.
 */
export const DeckPlank = memo(
  ({ id, part, layoutMode, active, companionShown, settings, path, classNames }: DeckPlankProps) => {
    const { findFirstFocusable } = useFocusFinders();
    const rootRef = useRef<HTMLDivElement>(null);
    const {
      node,
      companions,
      resolvedCompanionId,
      hasCompanion,
      companionOrientation,
      capabilities,
      sigilActions,
      popoverAnchorId,
      scrollIntoView,
      onAction,
      onAdjust,
      onScrollIntoView,
      onUpdateCompanion,
    } = useDeckPlank({ id, part, layoutMode, active, companionShown, deckEnabled: settings?.enableDeck });

    // Memoize the split point per orientation so toggling side-by-side ↔ stacked restores each one.
    const { size: companionSize, onSizeChange: onCompanionSizeChange } = useCompanionSplit(companionOrientation);

    // Newly opened/navigated planks are flagged via `scrollIntoView`; focus the pane so it gains
    // attention, then clear the one-shot flag.
    useEffect(() => {
      if (scrollIntoView === id) {
        rootRef.current?.focus();
        onScrollIntoView(undefined);
      }
    }, [scrollIntoView, id, onScrollIntoView]);

    // Tabster's focus group should move focus to Main on Escape, but something blocks it; handle directly.
    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) {
          switch (event.key) {
            case 'Escape':
              event.currentTarget.closest('main')?.focus();
              break;
            case 'Enter':
              findFirstFocusable(event.currentTarget)?.focus();
              break;
          }
        }
      },
      [findFirstFocusable],
    );

    if (!node) {
      return <PlankLoading />;
    }

    const controls = (
      <PlankControls
        capabilities={capabilities}
        layoutMode={layoutMode}
        close={part === 'complementary' ? 'minify-end' : true}
        onClick={onAdjust}
      />
    );

    const navbarEnd =
      part !== 'complementary' ? (
        <Surface.Surface type={AppSurface.NavbarEnd} data={{ subject: node.data } satisfies AppSurface.NavbarEndData} />
      ) : undefined;

    const sigilFooter = (
      <Surface.Surface type={AppSurface.MenuFooter} data={{ subject: node.data } satisfies AppSurface.MenuFooterData} />
    );

    // In fullscreen the toolbar is hidden so the content fills the viewport.
    const headless = layoutMode === 'solo--fullscreen';

    // Apply positioning `classNames` to whichever element is outermost (the Splitter when a companion is
    // shown, otherwise the Plank itself).
    const renderPlank = (plankClassNames?: DeckPlankProps['classNames']) => (
      <Plank
        ref={rootRef}
        node={node}
        attendableId={id}
        related={part === 'complementary'}
        actions={sigilActions}
        onAction={onAction}
        popoverAnchorId={popoverAnchorId}
        articleData={{ path }}
        controls={controls}
        navbarEnd={navbarEnd}
        sigilFooter={sigilFooter}
        fallback={PlankErrorFallback}
        placeholder={<PlankLoading />}
        headless={headless}
        onKeyDown={handleKeyDown}
        classNames={plankClassNames}
      />
    );

    if (!hasCompanion) {
      return renderPlank(classNames);
    }

    return (
      <Splitter.Root
        orientation={companionOrientation}
        anchor='end'
        resizable
        size={companionSize}
        minSize={20}
        onSizeChange={onCompanionSizeChange}
        classNames={classNames}
      >
        <Splitter.Panel position='start'>{renderPlank()}</Splitter.Panel>
        <Splitter.Handle />
        <Splitter.Panel position='end'>
          <Companion
            companions={companions}
            value={resolvedCompanionId}
            onValueChange={onUpdateCompanion}
            attendableId={id}
            companionTo={node.data}
            controls={<PlankCompanionControls primary={id} />}
          />
        </Splitter.Panel>
      </Splitter.Root>
    );
  },
);

DeckPlank.displayName = 'DeckPlank';
