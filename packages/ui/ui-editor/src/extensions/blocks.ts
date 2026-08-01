//
// Copyright 2026 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension, Facet, RangeSetBuilder } from '@codemirror/state';
import { EditorView, GutterMarker, RectangleMarker, ViewPlugin, gutter, layer } from '@codemirror/view';

export type BlocksOptions = {
  /** Class applied to each block box element. */
  className?: string;
  /**
   * Pin the drag preview to the block's left edge so it only tracks vertically (default `true`).
   * When `false`, the preview follows the pointer on both axes.
   */
  clampX?: boolean;
};

const DEFAULT_CLASS = 'cm-block';

// Whether the drag preview stays clamped to the block's left edge (see `BlocksOptions.clampX`).
const clampXFacet = Facet.define<boolean, boolean>({
  combine: (values) => values[0] ?? true,
});

// Space (px) between the text bounds and the box border, applied above and below.
const BOX_PADDING = 2;

// Amount (px) the box extends left of the content, into the gutter, so its left border is not flush
// against the text. Only the left edge moves — extending right would grow the scroller and add a
// horizontal scrollbar, and the text stays put.
const BOX_INSET_X = 8;

// Fine adjustment of the drag preview relative to the source block (x right+, y down+).
const PREVIEW_OFFSET = { x: -1, y: -2.5 };

// Fine vertical adjustment of the drop indicator relative to the block gap (negative is up).
const INDICATOR_OFFSET_Y = -6;

// Distance (px) from the viewport's top/bottom edge within which a drag auto-scrolls the editor.
const AUTOSCROLL_ZONE = 48;

// Maximum auto-scroll speed (px per animation frame), reached at the very edge and ramped down to 0
// at the far side of the zone.
const AUTOSCROLL_MAX_SPEED = 14;

type Block = { from: number; to: number };

/**
 * Top-level markdown blocks (headings, paragraphs, lists, blockquotes, fenced code, …) from the
 * syntax tree, so a list or code fence moves and boxes as a single unit. Memoized per state — the
 * boxes layer, the gutter, and the drag plugin all query it on the same state.
 */
const blockCache = new WeakMap<EditorState, Block[]>();
const findBlocks = (state: EditorState): Block[] => {
  const cached = blockCache.get(state);
  if (cached) {
    return cached;
  }

  const blocks: Block[] = [];
  const cursor = syntaxTree(state).topNode.cursor();
  if (cursor.firstChild()) {
    do {
      if (cursor.to > cursor.from) {
        blocks.push({ from: cursor.from, to: cursor.to });
      }
    } while (cursor.nextSibling());
  }

  blockCache.set(state, blocks);
  return blocks;
};

//
// Boxes (non-interactive layer behind the text).
//

/**
 * Builds one full-width rectangle per visible block. `RectangleMarker` coordinates are relative to
 * CodeMirror's layer origin, which is the scroller's left edge (before the gutter) — so the box is
 * offset right by the content's distance from the scroller (the gutter width) to align with the text.
 * The vertical origin is the content top. Bounds come from `lineBlockAt` — the same line-block
 * geometry the gutter (and thus the drag handle) uses — so the box top aligns with the handle and the
 * box encloses a tall styled line (heading), which `coordsAtPos` under-reports.
 */
const buildMarkers = (view: EditorView, className: string): RectangleMarker[] => {
  const contentRect = view.contentDOM.getBoundingClientRect();
  const gutterOffset = contentRect.left - view.scrollDOM.getBoundingClientRect().left;
  const markers: RectangleMarker[] = [];
  for (const block of findBlocks(view.state)) {
    // Clamp to the rendered viewport.
    const from = Math.max(block.from, view.viewport.from);
    const to = Math.min(block.to, view.viewport.to);
    if (from > to) {
      continue;
    }

    const firstLine = view.lineBlockAt(from);
    const lastLine = view.lineBlockAt(to);
    markers.push(
      new RectangleMarker(
        className,
        gutterOffset - BOX_INSET_X,
        firstLine.top - BOX_PADDING,
        contentRect.width + BOX_INSET_X,
        lastLine.bottom - firstLine.top + BOX_PADDING * 2,
      ),
    );
  }

  return markers;
};

//
// Drag-to-move.
//

/**
 * Moves the block at `sourceIndex` to the slot before `dropIndex` (or the end of the document when
 * `dropIndex === blocks.length`), preserving blank-line separation. Expressed as a minimal
 * delete + insert so it is a single undo step and syncs as a small edit through the data extension.
 */
const moveBlock = (view: EditorView, sourceIndex: number, dropIndex: number): void => {
  const { state } = view;
  const blocks = findBlocks(state);
  const count = blocks.length;
  // Dropping into the block's own slot (before itself or before its successor) is a no-op.
  if (sourceIndex < 0 || sourceIndex >= count || dropIndex === sourceIndex || dropIndex === sourceIndex + 1) {
    return;
  }

  const source = blocks[sourceIndex];
  const text = state.doc.sliceString(source.from, source.to);

  // Remove the block together with one adjacent separator so no blank line is orphaned.
  const deleteFrom = sourceIndex + 1 < count ? source.from : blocks[sourceIndex - 1].to;
  const deleteTo = sourceIndex + 1 < count ? blocks[sourceIndex + 1].from : source.to;

  // Insert before the drop-target block, or append at the end.
  const insertAt = dropIndex < count ? blocks[dropIndex].from : state.doc.length;
  const insert = dropIndex < count ? `${text}\n\n` : `\n\n${text}`;
  if (insertAt > deleteFrom && insertAt < deleteTo) {
    return;
  }

  // Sort the two changes by position (CodeMirror requires ascending, non-overlapping specs).
  const changes =
    insertAt <= deleteFrom
      ? [
          { from: insertAt, insert },
          { from: deleteFrom, to: deleteTo },
        ]
      : [
          { from: deleteFrom, to: deleteTo },
          { from: insertAt, insert },
        ];

  view.dispatch({ changes, userEvent: 'move.block' });
};

/** Manages an in-progress block drag: the drop indicator and the pointer tracking. */
const blockDragPlugin = ViewPlugin.fromClass(
  class {
    #sourceIndex: number | null = null;
    #dropIndex: number | null = null;
    #indicator: HTMLElement | null = null;
    #preview: HTMLElement | null = null;
    // The preview's natural (untranslated) top-left in viewport coords; overlays translate from here to
    // viewport targets, so placement is exact regardless of any transformed/scrolled ancestor.
    #previewOrigin: { left: number; top: number } | null = null;
    // The dragged block's viewport rect (the preview lifts off from here) and the grab point.
    #blockRect: { left: number; top: number; width: number; height: number } | null = null;
    #grabX = 0;
    #grabY = 0;
    // Latest pointer position, so the auto-scroll loop can re-evaluate the drop target and preview
    // between mouse moves (the pointer holds still at the edge while the content scrolls under it).
    #lastPointer: { clientX: number; clientY: number } | null = null;
    #scrollFrame: number | null = null;

    constructor(readonly view: EditorView) {}

    destroy() {
      this.#stop();
    }

    startDrag(sourceIndex: number, event: MouseEvent) {
      this.#sourceIndex = sourceIndex;
      this.#dropIndex = sourceIndex;
      this.#grabX = event.clientX;
      this.#grabY = event.clientY;
      this.#lastPointer = { clientX: event.clientX, clientY: event.clientY };
      this.#blockRect = this.#measureBlock(sourceIndex);
      if (!this.#indicator) {
        this.#indicator = this.view.dom.appendChild(document.createElement('div'));
        this.#indicator.className = 'cm-blockDropIndicator';
        this.#indicator.style.width = `${this.view.contentDOM.clientWidth}px`;
      }
      this.#preview = this.#buildPreview(sourceIndex);
      if (this.#preview) {
        // Both overlays sit at `top:0/left:0` in `.cm-editor`, so they share one measured origin;
        // `#positionPreview`/`#drawIndicator` translate from it to viewport targets.
        this.#preview.style.transform = 'none';
        const rect = this.#preview.getBoundingClientRect();
        this.#previewOrigin = { left: rect.left, top: rect.top };
      }
      this.#positionPreview(event.clientX, event.clientY); // Lift off exactly over the source block (zero delta).
      this.#drawIndicator(sourceIndex);
      this.view.scrollDOM.classList.add('cm-blockDragging');
      window.addEventListener('mousemove', this.#onMove);
      window.addEventListener('mouseup', this.#onUp);
      this.#scrollFrame = requestAnimationFrame(this.#autoScrollTick);
    }

    #stop() {
      window.removeEventListener('mousemove', this.#onMove);
      window.removeEventListener('mouseup', this.#onUp);
      if (this.#scrollFrame != null) {
        cancelAnimationFrame(this.#scrollFrame);
        this.#scrollFrame = null;
      }
      this.view.scrollDOM.classList.remove('cm-blockDragging');
      this.#indicator?.remove();
      this.#indicator = null;
      this.#preview?.remove();
      this.#preview = null;
      this.#previewOrigin = null;
      this.#blockRect = null;
      this.#sourceIndex = null;
      this.#dropIndex = null;
      this.#lastPointer = null;
    }

    // The dragged block's box rect in viewport coords. Rather than recomputing the box geometry (which
    // drifts from CodeMirror's actual `RectangleMarker` rendering by a pixel or two), copy the rendered
    // box element's rect so the preview is a verbatim overlay. Falls back to the `buildMarkers` formula
    // if the box element isn't found (e.g. off-screen).
    #measureBlock(sourceIndex: number): { left: number; top: number; width: number; height: number } | null {
      const block = findBlocks(this.view.state)[sourceIndex];
      if (!block) {
        return null;
      }

      // Expected box top in viewport coords, from the same `lineBlockAt` geometry `buildMarkers` uses.
      const contentRect = this.view.contentDOM.getBoundingClientRect();
      const firstLine = this.view.lineBlockAt(block.from);
      const lastLine = this.view.lineBlockAt(block.to);
      const targetTop = contentRect.top + firstLine.top - BOX_PADDING;

      // Pick the rendered box nearest this block's top. Blocks are separated by more than a line, so a
      // generous tolerance still selects the dragged block's own box while copying its exact rect.
      let match: DOMRect | null = null;
      for (const box of this.view.dom.querySelectorAll('.cm-block')) {
        const rect = box.getBoundingClientRect();
        if (!match || Math.abs(rect.top - targetTop) < Math.abs(match.top - targetTop)) {
          match = rect;
        }
      }
      if (match && Math.abs(match.top - targetTop) < 12) {
        return { left: match.left, top: match.top, width: match.width, height: match.height };
      }

      return {
        left: contentRect.left - BOX_INSET_X,
        top: targetTop,
        width: contentRect.width + BOX_INSET_X,
        height: lastLine.bottom - firstLine.top + BOX_PADDING * 2,
      };
    }

    // Clones the dragged block's rendered lines into a floating preview inside `.cm-editor` (so the
    // editor's theme styles apply to the clone), sized to the block's on-screen rect.
    #buildPreview(sourceIndex: number): HTMLElement | null {
      const { state } = this.view;
      const block = findBlocks(state)[sourceIndex];
      if (!block || !this.#blockRect) {
        return null;
      }

      const preview = document.createElement('div');
      preview.className = 'cm-blockDragPreview';
      preview.style.width = `${this.#blockRect.width}px`;
      preview.style.height = `${this.#blockRect.height}px`;
      // The box extends `BOX_INSET_X` left of the text; inset the cloned lines by the same amount so
      // they sit where the source text is rather than flush against the (extended) box's left edge.
      preview.style.paddingLeft = `${BOX_INSET_X}px`;

      // The cloned lines live in an inner element offset by `PREVIEW_OFFSET`, so the fine adjustment
      // nudges only the text — the box border stays aligned with the source block.
      const content = document.createElement('div');
      content.style.transform = `translate(${PREVIEW_OFFSET.x}px, ${PREVIEW_OFFSET.y}px)`;

      const startLine = state.doc.lineAt(block.from).number;
      const endLine = state.doc.lineAt(block.to).number;
      const seen = new Set<Element>();
      for (let lineNumber = startLine; lineNumber <= endLine; lineNumber++) {
        const { node } = this.view.domAtPos(state.doc.line(lineNumber).from);
        const element = node.nodeType === 1 ? (node as Element) : node.parentElement;
        const lineElement = element?.closest('.cm-line');
        if (lineElement && !seen.has(lineElement)) {
          seen.add(lineElement);
          content.appendChild(lineElement.cloneNode(true));
        }
      }

      preview.appendChild(content);
      // Appended inside `.cm-editor` so the editor theme styles the cloned lines; placed by
      // `#positionPreview` via a transform from the shared measured origin.
      return this.view.dom.appendChild(preview);
    }

    // The preview lifts off from the block's rect and follows the pointer by its drag delta, so the
    // grab point stays under the cursor. Vertical always tracks; horizontal is frozen when clamped.
    // Working in viewport coords (origin + block rect from `getBoundingClientRect`) sidesteps
    // offset-parent, scroll, and containing-block issues.
    #positionPreview(clientX: number, clientY: number) {
      if (!this.#preview || !this.#previewOrigin || !this.#blockRect) {
        return;
      }
      const dx = this.view.state.facet(clampXFacet) ? 0 : clientX - this.#grabX;
      const dy = clientY - this.#grabY;
      const left = this.#blockRect.left + dx - this.#previewOrigin.left;
      const top = this.#blockRect.top + dy - this.#previewOrigin.top;
      this.#preview.style.transform = `translate(${left}px, ${top}px)`;
    }

    // The slot the pointer is over: the first block whose vertical midpoint is below the pointer.
    #dropIndexAt(clientY: number): number {
      const blocks = findBlocks(this.view.state);
      for (let index = 0; index < blocks.length; index++) {
        const top = this.view.coordsAtPos(blocks[index].from);
        const bottom = this.view.coordsAtPos(blocks[index].to);
        if (!top || !bottom) {
          continue;
        }
        if (clientY < (top.top + bottom.bottom) / 2) {
          return index;
        }
      }
      return blocks.length;
    }

    #onMove = (event: MouseEvent) => {
      this.#lastPointer = { clientX: event.clientX, clientY: event.clientY };
      this.#updateFromPointer();
    };

    // Re-evaluate the drop target and reposition the preview from the last known pointer position.
    // Shared by mouse moves and the auto-scroll loop (which fires without new mouse events).
    #updateFromPointer() {
      if (!this.#lastPointer) {
        return;
      }
      this.#dropIndex = this.#dropIndexAt(this.#lastPointer.clientY);
      this.#drawIndicator(this.#dropIndex);
      this.#positionPreview(this.#lastPointer.clientX, this.#lastPointer.clientY);
    }

    // Scroll speed (px/frame) for the current pointer position: ramps from 0 at the inner edge of the
    // zone up to `AUTOSCROLL_MAX_SPEED` at (or past) the viewport edge. Negative scrolls up.
    #autoScrollDelta(clientY: number): number {
      const rect = this.view.scrollDOM.getBoundingClientRect();
      const fromTop = clientY - rect.top;
      const fromBottom = rect.bottom - clientY;
      if (fromTop < AUTOSCROLL_ZONE) {
        const intensity = Math.min(1, (AUTOSCROLL_ZONE - fromTop) / AUTOSCROLL_ZONE);
        return -Math.max(1, Math.round(intensity * AUTOSCROLL_MAX_SPEED));
      }
      if (fromBottom < AUTOSCROLL_ZONE) {
        const intensity = Math.min(1, (AUTOSCROLL_ZONE - fromBottom) / AUTOSCROLL_ZONE);
        return Math.max(1, Math.round(intensity * AUTOSCROLL_MAX_SPEED));
      }
      return 0;
    }

    #autoScrollTick = () => {
      this.#scrollFrame = null;
      if (this.#sourceIndex == null || !this.#lastPointer) {
        return;
      }
      const delta = this.#autoScrollDelta(this.#lastPointer.clientY);
      if (delta !== 0) {
        const scroller = this.view.scrollDOM;
        const before = scroller.scrollTop;
        scroller.scrollTop = before + delta;
        // Only re-evaluate when the scroll actually moved (clamped at the top/bottom otherwise).
        if (scroller.scrollTop !== before) {
          this.#updateFromPointer();
        }
      }
      this.#scrollFrame = requestAnimationFrame(this.#autoScrollTick);
    };

    #onUp = () => {
      const source = this.#sourceIndex;
      const drop = this.#dropIndex;
      this.#stop();
      if (source != null && drop != null) {
        moveBlock(this.view, source, drop);
      }
    };

    // Draws the drop indicator at the gap for `dropIndex`, translating from the shared origin to the
    // gap's viewport position (aligned with the block boxes at the content's left edge).
    #drawIndicator(dropIndex: number) {
      if (!this.#indicator || !this.#previewOrigin) {
        return;
      }
      const blocks = findBlocks(this.view.state);
      const rect =
        dropIndex < blocks.length
          ? this.view.coordsAtPos(blocks[dropIndex].from)
          : blocks.length > 0
            ? this.view.coordsAtPos(blocks[blocks.length - 1].to)
            : null;
      if (!rect) {
        this.#indicator.style.display = 'none';
        return;
      }

      const targetTop = (dropIndex < blocks.length ? rect.top : rect.bottom) + INDICATOR_OFFSET_Y;
      const targetLeft = this.view.contentDOM.getBoundingClientRect().left;
      this.#indicator.style.display = 'block';
      this.#indicator.style.transform = `translate(${targetLeft - this.#previewOrigin.left}px, ${targetTop - this.#previewOrigin.top}px)`;
    }
  },
);

/** Gutter grip anchored to a block's first line; mousedown starts a drag. */
class DragHandleMarker extends GutterMarker {
  override toDOM(): HTMLElement {
    const element = document.createElement('div');
    element.className = 'cm-blockDragHandle';
    element.textContent = '⠿';
    return element;
  }
}

const dragGutter = gutter({
  class: 'cm-blockDragGutter',
  markers: (view) => {
    const builder = new RangeSetBuilder<GutterMarker>();
    for (const block of findBlocks(view.state)) {
      builder.add(block.from, block.from, new DragHandleMarker());
    }
    return builder.finish();
  },
  domEventHandlers: {
    mousedown: (view, line, event) => {
      if (!(event instanceof MouseEvent)) {
        return false;
      }
      const blocks = findBlocks(view.state);
      const sourceIndex = blocks.findIndex((block) => block.from >= line.from && block.from <= line.to);
      if (sourceIndex < 0) {
        return false;
      }
      view.plugin(blockDragPlugin)?.startDrag(sourceIndex, event);
      event.preventDefault();
      return true;
    },
  },
});

//
// Theme.
//

const blockTheme = EditorView.theme({
  // The layer sits below the text (`above: false`); keep it out of the way of pointer/selection.
  '.cm-blockLayer': {
    pointerEvents: 'none',
  },
  '.cm-block': {
    boxSizing: 'border-box',
    borderRadius: '4px',
    border: '1px solid var(--dx-block-border, color-mix(in srgb, currentColor 12%, transparent))',
    backgroundColor: 'var(--dx-block-surface, color-mix(in srgb, currentColor 4%, transparent))',
  },
  '.cm-blockDragGutter': {
    width: '60px',
  },
  '.cm-blockDragHandle': {
    display: 'flex',
    // Anchor the grip to the top of the block (its first line), not the line's vertical center.
    alignItems: 'flex-start',
    justifyContent: 'center',
    height: '100%',
    cursor: 'grab',
    color: 'var(--dx-description, currentColor)',
    opacity: '0.35',
    transition: 'opacity 0.2s',
  },
  '.cm-blockDragHandle:hover': {
    opacity: '1',
  },
  '.cm-scroller.cm-blockDragging': {
    cursor: 'grabbing',
  },
  '.cm-scroller.cm-blockDragging .cm-content': {
    userSelect: 'none',
  },
  '.cm-blockDropIndicator': {
    position: 'absolute',
    top: '0',
    left: '0',
    height: '2px',
    backgroundColor: 'var(--dx-accent-text, currentColor)',
    pointerEvents: 'none',
    display: 'none',
    zIndex: '5',
  },
  '.cm-blockDragPreview': {
    position: 'absolute',
    top: '0',
    left: '0',
    zIndex: '6',
    pointerEvents: 'none',
    // Explicit block-matched height with the border inside it, so the preview matches the source size.
    boxSizing: 'border-box',
    overflow: 'hidden',
    opacity: '0.9',
    borderRadius: '4px',
    border: '1px solid var(--dx-separator, color-mix(in srgb, currentColor 20%, transparent))',
    // Sink the cloned lines to `BOX_PADDING` below the box top (matching the source text), accounting
    // for the 1px border — so the preview text overlays the source text exactly.
    padding: '1px 0',
    backgroundColor: 'var(--dx-base-surface, Canvas)',
    boxShadow: '0 8px 24px rgb(0 0 0 / 0.35)',
  },
});

/**
 * Renders each top-level markdown block as a non-interactive box behind the text, with a gutter drag
 * handle to reorder blocks. The document stays fully editable (no text is replaced with widgets); the
 * boxes are drawn in a below-text layer and re-measured on edits, scrolling, and viewport changes.
 * Dragging a handle moves the block (a single delete + insert transaction) and shows a drop indicator.
 */
export const blocks = ({ className = DEFAULT_CLASS, clampX = true }: BlocksOptions = {}): Extension => [
  blockTheme,
  clampXFacet.of(clampX),
  blockDragPlugin,
  dragGutter,
  layer({
    above: false,
    class: 'cm-blockLayer',
    update: (update) => update.docChanged || update.viewportChanged || update.geometryChanged,
    markers: (view) => buildMarkers(view, className),
  }),
];
