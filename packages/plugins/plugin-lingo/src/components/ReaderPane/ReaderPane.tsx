//
// Copyright 2026 DXOS.org
//

import { tooltips } from '@codemirror/view';
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
  documentSlots,
} from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';
import { isTruthy } from '@dxos/util';

import { type SegmentSide, type SegmentsOptions, hideImages, segments, setSegments, setSelected } from '#extensions';

export type ReaderPaneProps = ThemedClassName<
  Pick<SegmentsOptions, 'render' | 'onSelect' | 'onActivate'> & {
    content: string;
    /** Render markdown decorations; pass `false` to read the source with its markup intact. */
    markdown?: boolean;
    /** Which text this pane holds; decides which of a segment's two ranges it decorates. */
    side?: SegmentSide;
    /** Drop images; a reading companion wants the prose, not the figures. */
    images?: boolean;
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
  images = true,
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
  const handleRender = useCallback<NonNullable<SegmentsOptions['render']>>(
    (el, props, view) => handlers.current.render?.(el, props, view),
    [],
  );
  const handleSelect = useCallback<NonNullable<SegmentsOptions['onSelect']>>(
    (segment) => handlers.current.onSelect?.(segment),
    [],
  );
  const handleActivate = useCallback<NonNullable<SegmentsOptions['onActivate']>>(
    (segment) => handlers.current.onActivate?.(segment),
    [],
  );

  const extensions = useMemo<Extension[]>(
    () =>
      [
        createBasicExtensions({ readOnly: true, lineWrapping: true, search: true }),
        // Parented to the body: the companion clips its own overflow so the editor can scroll, which
        // otherwise cuts the hover card off at the panel edge.
        tooltips({ parent: document.body, position: 'fixed' }),
        createThemeExtensions({ themeMode, slots: documentSlots }),
        // The language bundle only highlights; `decorateMarkdown` is what hides the markup,
        // so the reader needs both to show prose rather than source.
        // Both halves are needed: `skip` stops the image widget rendering but leaves the markdown
        // source behind, and `hideImages` removes that source.
        markdown && [
          createMarkdownExtensions(),
          decorateMarkdown({ skip: images ? undefined : ({ name }) => name === 'Image' }),
        ],
        !images && hideImages(),
        segments({ side, render: handleRender, onSelect: handleSelect, onActivate: handleActivate }),
      ].filter(isTruthy),
    [themeMode, markdown, images, side, handleRender, handleSelect, handleActivate],
  );

  const { parentRef, view } = useTextEditor({ initialValue: content, extensions }, [content, extensions]);

  // Analysis arrives after the editor mounts (a model round-trip, or a cache read),
  // so it is dispatched rather than passed as an initial extension.
  useEffect(() => {
    if (!view) {
      return;
    }

    // An empty dispatch rather than an early return: losing the analysis has to reach the editor, or
    // it keeps decorating the text with the analysis of a passage that is no longer shown.
    view.dispatch({
      effects: setSegments.of({
        segments: analysis?.segments ?? [],
        hash: (side === 'source' ? analysis?.sourceHash : analysis?.targetHash) ?? '',
      }),
    });
  }, [view, analysis, side]);

  // Mirrors the other pane: an external selection is applied without re-running local tracking.
  useEffect(() => {
    if (view) {
      // `setSelected` carries `string | undefined` precisely so a cleared selection can be sent;
      // gating on a defined value left the pane highlighting a segment nothing had selected.
      view.dispatch({ effects: setSelected.of(selected) });
    }
  }, [view, selected]);

  return <div className={mx('flex grow min-h-0 overflow-hidden', classNames)} ref={parentRef} />;
};

ReaderPane.displayName = 'ReaderPane';
