//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { type Segmentation } from '@dxos/nlp';
import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import {
  type Extension,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
} from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';
import { isTruthy } from '@dxos/util';

import { type SegmentSide, type SegmentsOptions, segments, setSegments, setSelected } from '#extensions';

export type ReaderPaneProps = ThemedClassName<
  Pick<SegmentsOptions, 'render' | 'onSelect' | 'onActivate'> & {
    content: string;
    /** Render markdown decorations; pass `false` to read the source with its markup intact. */
    markdown?: boolean;
    /** Which text this pane holds; decides which of a segment's two ranges it decorates. */
    side?: SegmentSide;
    analysis?: Segmentation;
    /** Externally-driven selection — how the other pane's selection is mirrored here. */
    selected?: string;
  }
>;

/**
 * One read-only pane of the reader companion: the source text with its analysis revealed.
 *
 * Read-only by construction — the companion never writes to the document it is reading, so the
 * source object stays owned by whichever plugin (markdown, inbox, …) actually renders it.
 */
export const ReaderPane = ({
  content,
  markdown = true,
  side = 'source',
  analysis,
  selected,
  render,
  onSelect,
  onActivate,
  classNames,
}: ReaderPaneProps) => {
  const { themeMode } = useThemeContext();

  // Callbacks are read through a ref so they stay out of the extension identity. An extension array
  // that changes rebuilds the editor, and a caller passing an inline handler would then tear the
  // editor down on every selection — losing the decorations the selection just produced.
  const handlers = useRef({ render, onSelect, onActivate });
  handlers.current = { render, onSelect, onActivate };
  const stableRender = useCallback<NonNullable<SegmentsOptions['render']>>(
    (el, props, view) => handlers.current.render?.(el, props, view),
    [],
  );
  const stableSelect = useCallback<NonNullable<SegmentsOptions['onSelect']>>(
    (segment) => handlers.current.onSelect?.(segment),
    [],
  );
  const stableActivate = useCallback<NonNullable<SegmentsOptions['onActivate']>>(
    (segment) => handlers.current.onActivate?.(segment),
    [],
  );

  const extensions = useMemo<Extension[]>(
    () =>
      [
        createBasicExtensions({ readOnly: true, lineWrapping: true, search: true }),
        createThemeExtensions({ themeMode }),
        // The language bundle only highlights; `decorateMarkdown` is what hides the markup, so the
        // reader needs both to show prose rather than source.
        markdown && [createMarkdownExtensions(), decorateMarkdown()],
        segments({ side, render: stableRender, onSelect: stableSelect, onActivate: stableActivate }),
      ].filter(isTruthy),
    [themeMode, markdown, side, stableRender, stableSelect, stableActivate],
  );

  const { parentRef, view } = useTextEditor({ initialValue: content, extensions }, [content, extensions]);

  // Analysis arrives after the editor mounts (a model round-trip, or a cache read), so it is
  // dispatched rather than passed as an initial extension.
  useEffect(() => {
    if (!view || !analysis) {
      return;
    }

    view.dispatch({
      effects: setSegments.of({
        segments: analysis.segments,
        hash: (side === 'source' ? analysis.sourceHash : analysis.targetHash) ?? '',
      }),
    });
  }, [view, analysis, side]);

  // Mirrors the other pane: an external selection is applied without re-running local tracking.
  useEffect(() => {
    if (view && selected !== undefined) {
      view.dispatch({ effects: setSelected.of(selected) });
    }
  }, [view, selected]);

  return <div className={mx('flex min-h-0 overflow-hidden', classNames)} ref={parentRef} />;
};

ReaderPane.displayName = 'ReaderPane';
