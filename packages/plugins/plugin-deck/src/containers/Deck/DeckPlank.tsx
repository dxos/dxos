//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEvent, memo, useCallback, useLayoutEffect, useMemo, useRef } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as NotFound from '@dxos/app-toolkit/NotFound';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { findFirstFocusable } from '@dxos/react-focus';
import { type ThemedClassName } from '@dxos/react-ui';
import { Attention, useAttentionContext } from '@dxos/react-ui-attention';

import { Plank } from '#components';
import { useBreadcrumbs, useDeckSettings } from '#hooks';
import { DeckSchema } from '#types';

import { focusPane } from '../../util/index.ts';
import { CompanionPlank } from './CompanionPlank.tsx';
import { focusContent } from './focus-content.ts';
import { PlankControls } from './PlankControls.tsx';
import { PlankErrorFallback } from './PlankFallback.tsx';
import { useDeckPlank } from './useDeckPlank.ts';

export type DeckPlankProps = ThemedClassName<{
  id: string;
  part: DeckSchema.ResolvedPart;
  /** Whether this plank is displayed fullscreen (headless, no chrome). */
  fullscreen?: boolean;
  /** The real active planks (excludes the derived companion plank), for ordering/close semantics. */
  active?: string[];
  path?: string[];
}>;

/**
 * Connected deck plank: resolves the node, actions and operation handlers via {@link useDeckPlank} and
 * renders the presentational {@link Plank}. A companion id (a `~<variant>` linked segment) is an ordinary
 * plank too — delegated to {@link CompanionPlank}, which supplies the companion's own header and content —
 * so the deck layout never special-cases companions.
 */
export const DeckPlank = memo(({ id, part, fullscreen = false, active, path, classNames }: DeckPlankProps) => {
  if (Attention.isLinkedSegment(id)) {
    return <CompanionPlank id={id} classNames={classNames} />;
  }

  return (
    <DeckPlankInner id={id} part={part} fullscreen={fullscreen} active={active} path={path} classNames={classNames} />
  );
});

DeckPlank.displayName = 'DeckPlank';

const DeckPlankInner = ({ id, part, fullscreen = false, active, path, classNames }: DeckPlankProps) => {
  const { invokePromise } = useOperationInvoker();
  const rootRef = useRef<HTMLDivElement>(null);
  const { attention } = useAttentionContext('DeckPlank');
  const {
    node,
    unresolved,
    notFoundNode,
    capabilities,
    sigilActions,
    popoverAnchorId,
    scrollIntoView,
    expanded,
    onAction,
    onAdjust,
    onScrollIntoView,
  } = useDeckPlank({ id, part, active });

  // In flat mode only the current (last) plank renders; its predecessors in the stack become
  // breadcrumbs in the heading. Clicking one drops the planks after it (go back), reusing Close.
  const { flatten } = useDeckSettings();
  const breadcrumbIds = useMemo(
    () => (flatten && part === 'main' && active ? active.slice(0, active.indexOf(id)) : []),
    [flatten, part, active, id],
  );
  const breadcrumbs = useBreadcrumbs(breadcrumbIds);
  const onSelectBreadcrumb = useCallback(
    (crumbId: string) => {
      const index = active?.indexOf(crumbId) ?? -1;
      if (active && index >= 0 && index < active.length - 1) {
        void invokePromise(LayoutOperation.Close, { subject: active.slice(index + 1) });
      }
    },
    [invokePromise, active],
  );

  // A layout effect, since attention is derived from focus and focus has to move in the task that
  // inserted this plank or its first painted frame reads as unattended. Scrolling is owned by the deck
  // viewport, which positions the plank past the pile of spines, so this focus must not scroll.
  // The wait for a lazy article's content, held outside the effect: clearing the intent below re-runs
  // the effect at once, which must not cancel a wait it just started.
  const contentFocusRef = useRef<(() => void) | undefined>(undefined);
  useLayoutEffect(() => {
    if (scrollIntoView?.id === id) {
      contentFocusRef.current?.();
      if (scrollIntoView.focus === 'content') {
        // Straight into the content: a keyboard navigation that landed on the plank itself would need
        // a second Enter before the reader could type.
        contentFocusRef.current = focusContent(rootRef.current);
      } else if (scrollIntoView.focus !== false) {
        focusPane(rootRef.current);
      } else if (attention && rootRef.current) {
        Attention.attendElement(attention, rootRef.current);
      }
      onScrollIntoView(undefined);
    }
  }, [scrollIntoView, id, onScrollIntoView, attention]);
  useLayoutEffect(() => () => contentFocusRef.current?.(), []);

  // The landmark focus group should move focus to Main on Escape, but something blocks it; handle directly.
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
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
  }, []);

  // Stable reference so Plank's useMemo on articleData doesn't bust every render. An unresolved plank
  // addresses the not-found article rather than its own (absent) node, while the shell below stays
  // keyed to the real plank id so close, focus and attention keep working.
  const articleData = useMemo(
    () => (unresolved ? { path, attendableId: NotFound.NOT_FOUND_PATH } : { path }),
    [path, unresolved],
  );

  // The plank the URL names, before anything has resolved: an id and nothing else.
  const loadingNode = useMemo(() => ({ id }), [id]);

  // Memoized so the navbar and footer surfaces see one data reference per node: an inline literal
  // would hand them a fresh object every render, which the surface metrics flag as unstable data.
  const shellNode = node ?? (unresolved ? notFoundNode : undefined);
  const shellData = useMemo(() => ({ subject: shellNode?.data }), [shellNode?.data]);

  const controls = (
    <PlankControls
      capabilities={capabilities}
      fullscreen={fullscreen}
      expanded={expanded}
      close={part === 'complementary' ? 'minify-end' : true}
      onClick={onAdjust}
    />
  );

  const headless = fullscreen;

  if (!shellNode) {
    return (
      <Plank
        ref={rootRef}
        node={loadingNode}
        attendableId={id}
        related={part === 'complementary'}
        pending
        controls={controls}
        headless={headless}
        onKeyDown={handleKeyDown}
        classNames={classNames}
      />
    );
  }

  const navbarEnd =
    part !== 'complementary' ? (
      <Surface.Surface type={AppSurface.NavbarEnd} data={shellData satisfies AppSurface.NavbarEndData} />
    ) : undefined;

  const sigilFooter = (
    <Surface.Surface type={AppSurface.MenuFooter} data={shellData satisfies AppSurface.MenuFooterData} />
  );

  return (
    <Plank
      ref={rootRef}
      node={shellNode}
      attendableId={id}
      related={part === 'complementary'}
      actions={sigilActions}
      onAction={onAction}
      breadcrumbs={breadcrumbs}
      onSelectBreadcrumb={onSelectBreadcrumb}
      popoverAnchorId={popoverAnchorId}
      articleData={articleData}
      controls={controls}
      navbarEnd={navbarEnd}
      sigilFooter={sigilFooter}
      fallback={PlankErrorFallback}
      headless={headless}
      onKeyDown={handleKeyDown}
      classNames={classNames}
    />
  );
};
