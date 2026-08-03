//
// Copyright 2026 DXOS.org
//

import { useFocusFinders } from '@fluentui/react-tabster';
import React, { type KeyboardEvent, memo, useCallback, useEffect, useMemo, useRef } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { useNode } from '@dxos/plugin-graph/hooks';
import { type ThemedClassName } from '@dxos/react-ui';
import { Attention } from '@dxos/react-ui-attention';

import { Plank } from '#components';
import { useBreadcrumbs, useCompanions, useDeckSettings } from '#hooks';
import { type ResolvedPart } from '#types';

import { PlankControls } from './PlankControls';
import { PlankErrorFallback, PlankLoading } from './PlankFallback';
import { useDeckPlank } from './useDeckPlank';

const PLANK_LOADING = <PlankLoading />;

export type DeckPlankProps = ThemedClassName<{
  id: string;
  part: ResolvedPart;
  /** Whether this plank is displayed fullscreen (headless, no chrome). */
  fullscreen?: boolean;
  /** The real active planks, for ordering/close semantics. */
  active?: string[];
  path?: string[];
}>;

/**
 * Connected deck plank: resolves the node, actions and operation handlers via {@link useDeckPlank} and
 * renders the presentational {@link Plank}.
 */
export const DeckPlank = memo(({ id, part, fullscreen = false, active, path, classNames }: DeckPlankProps) => (
  <DeckPlankInner id={id} part={part} fullscreen={fullscreen} active={active} path={path} classNames={classNames} />
));

DeckPlank.displayName = 'DeckPlank';

const DeckPlankInner = ({ id, part, fullscreen = false, active, path, classNames }: DeckPlankProps) => {
  const { findFirstFocusable } = useFocusFinders();
  const { invokePromise } = useOperationInvoker();
  const { graph } = useAppGraph();
  const rootRef = useRef<HTMLDivElement>(null);
  const {
    node,
    capabilities,
    sigilActions,
    popoverAnchorId,
    scrollIntoView,
    expanded,
    onAction,
    onAdjust,
    onScrollIntoView,
  } = useDeckPlank({ id, part, active });

  // A companion popped out of the sidebar is an ordinary plank whose id names its source
  // (`<source>/~<variant>`). It stays pinned to that source, so the source is shown as a leading
  // breadcrumb — the only way to tell two clones of the same companion apart.
  const sourceId = useMemo(() => (Attention.isLinkedSegment(id) ? id.slice(0, id.lastIndexOf('/')) : undefined), [id]);
  // Reading the source's companions materializes them: on a cold restore the clone's own node does not
  // exist until its source's child connections have been computed.
  useCompanions(sourceId);

  // In flat mode only the current (last) plank renders; its predecessors in the stack become
  // breadcrumbs in the heading. Clicking one drops the planks after it (go back), reusing Close.
  const { flatten } = useDeckSettings();
  const breadcrumbIds = useMemo(() => {
    const trail = flatten && part === 'main' && active ? active.slice(0, active.indexOf(id)) : [];
    // The source crumb sits closest to the title; a flat-mode trail reads before it.
    return sourceId && !trail.includes(sourceId) ? [...trail, sourceId] : trail;
  }, [flatten, part, active, id, sourceId]);
  const breadcrumbs = useBreadcrumbs(breadcrumbIds);
  const onSelectBreadcrumb = useCallback(
    (crumbId: string) => {
      // The source crumb navigates to the source rather than going back: it may not be open at all,
      // since a clone outlives the plank it was popped from.
      if (crumbId === sourceId) {
        if (active?.includes(crumbId)) {
          void invokePromise(LayoutOperation.ScrollIntoView, { subject: crumbId });
        } else {
          void invokePromise(LayoutOperation.Open, {
            subject: [crumbId],
            pivotId: id,
            disposition: 'add',
            navigation: 'immediate',
          });
        }
        return;
      }

      const index = active?.indexOf(crumbId) ?? -1;
      if (active && index >= 0 && index < active.length - 1) {
        void invokePromise(LayoutOperation.Close, { subject: active.slice(index + 1) });
      }
    },
    [invokePromise, active, sourceId, id],
  );

  // Newly opened/navigated planks (and a folded plank returned to view by its spine) are flagged via
  // `scrollIntoView`; focus the pane so it gains attention, then clear the one-shot flag. Scrolling is
  // owned by the deck viewport, which positions the plank past the pile of spines, so this focus must
  // not scroll on its own.
  useEffect(() => {
    if (scrollIntoView === id) {
      rootRef.current?.focus({ preventScroll: true });
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

  // A clone renders through the same article contract as its sidebar panel, so plugins serve one
  // surface for both: `companionTo` is the source subject, `variant` the companion it is.
  const sourceNode = useNode(graph, sourceId);
  const articleData = useMemo(
    () => (sourceId ? { path, companionTo: sourceNode?.data, variant: Attention.getLinkedVariant(id) } : { path }),
    [path, sourceId, sourceNode?.data, id],
  );

  if (!node) {
    return PLANK_LOADING;
  }

  const controls = (
    <PlankControls
      capabilities={capabilities}
      fullscreen={fullscreen}
      expanded={expanded}
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
      related={part === 'complementary' || !!sourceId}
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
      placeholder={PLANK_LOADING}
      headless={headless}
      onKeyDown={handleKeyDown}
      classNames={classNames}
    />
  );
};
