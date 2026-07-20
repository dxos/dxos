//
// Copyright 2026 DXOS.org
//

import { useFocusFinders } from '@fluentui/react-tabster';
import React, { type KeyboardEvent, memo, useCallback, useEffect, useMemo, useRef } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { type ThemedClassName } from '@dxos/react-ui';
import { isLinkedSegment } from '@dxos/react-ui-attention';

import { Plank } from '#components';
import { type ResolvedPart } from '#types';

import { CompanionPlank } from './CompanionPlank';
import { PlankControls } from './PlankControls';
import { PlankErrorFallback, PlankLoading } from './PlankFallback';
import { useDeckPlank } from './useDeckPlank';

const PLANK_LOADING = <PlankLoading />;

export type DeckPlankProps = ThemedClassName<{
  id: string;
  part: ResolvedPart;
  /** Whether this plank is displayed fullscreen (headless, no chrome). */
  fullscreen?: boolean;
  /** The real active planks (excludes the derived companion plank), for ordering/close semantics. */
  active?: string[];
  /**
   * Whether the deck renders as a single fullbleed plank. Derived from the *rendered* plank count
   * (which includes the companion) by the parent; defaults to the `active`-based heuristic.
   */
  soloLook?: boolean;
  path?: string[];
}>;

/**
 * Connected deck plank: resolves the node, actions and operation handlers via {@link useDeckPlank} and
 * renders the presentational {@link Plank}. A companion id (a `~<variant>` linked segment) is an ordinary
 * plank too — delegated to {@link CompanionPlank}, which supplies the companion's own header and content —
 * so the deck layout never special-cases companions.
 */
export const DeckPlank = memo(
  ({ id, part, fullscreen = false, active, soloLook, path, classNames }: DeckPlankProps) => {
    if (isLinkedSegment(id)) {
      return <CompanionPlank id={id} classNames={classNames} />;
    }

    return (
      <DeckPlankInner
        id={id}
        part={part}
        fullscreen={fullscreen}
        active={active}
        soloLook={soloLook}
        path={path}
        classNames={classNames}
      />
    );
  },
);

DeckPlank.displayName = 'DeckPlank';

const DeckPlankInner = ({
  id,
  part,
  fullscreen = false,
  active,
  soloLook: soloLookProp,
  path,
  classNames,
}: DeckPlankProps) => {
  const { findFirstFocusable } = useFocusFinders();
  const rootRef = useRef<HTMLDivElement>(null);
  // A singleton (fullbleed) deck offers the manual fullscreen toggle and hides the increment/close
  // controls. Derived from the rendered plank count by the parent (so an open companion counts);
  // falls back to the real-plank heuristic.
  const soloLook = soloLookProp ?? (active === undefined || active.length === 1);
  const { node, capabilities, sigilActions, popoverAnchorId, scrollIntoView, onAction, onAdjust, onScrollIntoView } =
    useDeckPlank({ id, part, soloLook, active });

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

  // Stable reference so Plank's useMemo on articleData doesn't bust every render.
  const articleData = useMemo(() => ({ path }), [path]);

  if (!node) {
    return PLANK_LOADING;
  }

  const controls = (
    <PlankControls
      capabilities={capabilities}
      soloLook={soloLook}
      fullscreen={fullscreen}
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
  const headless = fullscreen;

  return (
    <Plank
      ref={rootRef}
      node={node}
      attendableId={id}
      related={part === 'complementary'}
      actions={sigilActions}
      onAction={onAction}
      popoverAnchorId={popoverAnchorId}
      articleData={articleData}
      controls={controls}
      navbarEnd={navbarEnd}
      sigilFooter={sigilFooter}
      fallback={PlankErrorFallback}
      placeholder={PLANK_LOADING}
      headless={headless}
      onKeyDown={handleKeyDown}
      classNames={classNames}
    />
  );
};
