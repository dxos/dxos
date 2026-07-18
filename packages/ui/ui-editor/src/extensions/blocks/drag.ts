//
// Copyright 2026 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  GutterMarker,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
  gutter,
} from '@codemirror/view';

import { blockSelectionField, getSelectedBlocks, setBlockSelection, toggleBlockSelection } from './selection';

/** A contiguous document region that can be dragged and reordered as a unit. */
export type Block = {
  from: number;
  to: number;
};

export type BlockDragOptions = {
  /**
   * Enumerates the draggable blocks for a state, in document order. Ranges must be non-overlapping so
   * the gutter, drop-index, and preview geometry stay unambiguous.
   */
  getBlocks: (state: EditorState) => Block[];
  /**
   * Moves the blocks at `sourceIndices` to the slot before `dropIndex` (the end of the document when
   * `dropIndex === blocks.length`), preserving their relative order, as a single edit.
   */
  moveBlocks: (view: EditorView, sourceIndices: number[], dropIndex: number) => void;
  /**
   * Pin the drag preview to the block's left edge so it only tracks vertically (default `true`).
   * When `false`, the preview follows the pointer on both axes.
   */
  clampX?: boolean;
  /** Class applied to the drag gutter (default `cm-blockDragGutter`, styled at 60px wide). */
  gutterClass?: string;
};

// Space (px) between the text bounds and the box border, applied above and below. Matches the outline
// layer so the drag preview lifts off exactly over the source block.
const BOX_PADDING = 2;

// Amount (px) the box extends left of the content, into the gutter, so its left border is not flush
// against the text. Only the left edge moves.
const BOX_INSET_X = 8;

// Fine horizontal adjustment of the cloned preview text (the 1px preview border shifts it right by 1px).
const PREVIEW_OFFSET = { x: -1, y: 0 };

// Distance (px) from the viewport's top/bottom edge within which a drag auto-scrolls the editor.
const AUTOSCROLL_ZONE = 48;

// Maximum auto-scroll speed (px per animation frame).
const AUTOSCROLL_MAX_SPEED = 14;

// Pointer travel (px) past which an armed handle press becomes a drag rather than a click.
const DRAG_THRESHOLD = 4;

const DEFAULT_GUTTER_CLASS = 'cm-blockDragGutter';

/** Gutter grip anchored to a block's first line; press toggles selection, drag reorders. */
class DragHandleMarker extends GutterMarker {
  // The gutter element spans the block's full (possibly multi-row/wrapped) height, so sizing the grip
  // to the first row's height and top-anchoring it centers the grip on that line — a tall heading or a
  // short body line — rather than on the middle of the whole block.
  constructor(readonly rowHeight: number | undefined) {
    super();
  }

  override eq(other: DragHandleMarker): boolean {
    return other.rowHeight === this.rowHeight;
  }

  override toDOM(): HTMLElement {
    const element = document.createElement('div');
    element.className = 'cm-blockDragHandle';
    if (this.rowHeight != null) {
      element.style.height = `${this.rowHeight}px`;
    }
    element.textContent = '⠿';
    return element;
  }
}

// Height (px) of a block's first rendered row, used to center the gutter grip on that line. Computed
// synchronously from the height map and default line height — both safe to read during an update (unlike
// `coordsAtPos`). A heading occupies a single tall row, so its whole line-block height is the row height;
// every other block's first row is the default line height.
const firstRowHeight = (view: EditorView, pos: number): number => {
  const node = syntaxTree(view.state).resolveInner(pos, 1);
  for (let current: typeof node | null = node; current; current = current.parent) {
    if (/Heading/.test(current.name)) {
      return view.lineBlockAt(pos).height;
    }
  }
  return view.defaultLineHeight;
};

// Indices of the blocks whose grips are shown, ascending: every selected block (so the group has a grab
// point and each can be shift-toggled) plus the block at the caret (so a fresh block can be grabbed or
// added to the selection).
const activeBlockIndices = (state: EditorState, getBlocks: BlockDragOptions['getBlocks']): number[] => {
  const indices = new Set(getSelectedBlocks(state, getBlocks).map((entry) => entry.index));
  const head = state.selection.main.head;
  const cursorIndex = getBlocks(state).findIndex((block) => head >= block.from && head <= block.to);
  if (cursorIndex >= 0) {
    indices.add(cursorIndex);
  }
  return [...indices].sort((a, b) => a - b);
};

//
// The in-progress drag's decorations, or `null` when idle: each dragged block (with its trailing blank
// line) is collapsed out of the document (`collapses`), and a gap (`placeholderPos`) opens at the drop
// slot so the content closes over the lifted blocks and reopens at the landing spot.
//
type DragDecoState = {
  collapses: { from: number; to: number }[];
  placeholderPos: number;
  // Height of the bordered box (the blocks) and the total reserved height (blocks + trailing blanks); the
  // difference is empty space below the box, matching the collapsed separators.
  blockHeight: number;
  totalHeight: number;
} | null;

const setDragDeco = StateEffect.define<DragDecoState>();

/**
 * Block-level spacer at the drop position. The outer element reserves the full collapsed height so
 * nothing shifts; the inner box carries the border and matches the blocks, leaving the blanks as empty
 * space below.
 */
class PlaceholderWidget extends WidgetType {
  constructor(
    readonly blockHeight: number,
    readonly totalHeight: number,
  ) {
    super();
  }

  override eq(other: PlaceholderWidget): boolean {
    return other.blockHeight === this.blockHeight && other.totalHeight === this.totalHeight;
  }

  override toDOM(): HTMLElement {
    const element = document.createElement('div');
    element.className = 'cm-blockDropPlaceholder';
    element.style.height = `${this.totalHeight}px`;
    const box = element.appendChild(document.createElement('div'));
    box.className = 'cm-blockDropPlaceholderBox';
    box.style.height = `${this.blockHeight}px`;
    return element;
  }
}

const dragDecoField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update: (value, tr) => {
    let next = value.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(setDragDeco)) {
        if (effect.value == null) {
          next = Decoration.none;
        } else {
          const { collapses, placeholderPos, blockHeight, totalHeight } = effect.value;
          next = Decoration.set(
            [
              // Collapse each dragged block (and its trailing blank line) out of the document flow.
              ...collapses.map((range) => Decoration.replace({ block: true }).range(range.from, range.to)),
              // Open the gap at the drop slot (before the target line, or after the last line).
              Decoration.widget({
                widget: new PlaceholderWidget(blockHeight, totalHeight),
                block: true,
                side: placeholderPos >= tr.state.doc.length ? 1 : -1,
              }).range(placeholderPos),
            ],
            // Sort: the placeholder and collapses may interleave.
            true,
          );
        }
      }
    }
    return next;
  },
  provide: (field) => EditorView.decorations.from(field),
});

/** Manages the armed press → click / drag lifecycle, the drop placeholder, and pointer tracking. */
const createDragPlugin = (
  getBlocks: BlockDragOptions['getBlocks'],
  moveBlocks: BlockDragOptions['moveBlocks'],
  clampX: boolean,
) =>
  ViewPlugin.fromClass(
    class {
      // Armed but not yet dragging: the press that may become a click or a drag.
      #armed: { index: number; shiftKey: boolean; x: number; y: number } | null = null;

      // Active drag state (null until a press crosses the drag threshold).
      #sourceIndices: number[] | null = null;
      #dropIndex: number | null = null;
      #collapseHeights: number[] = [];
      #placeholderKey: string | null = null;
      #preview: HTMLElement | null = null;
      #previewOrigin: { left: number; top: number } | null = null;
      // The first dragged block's viewport rect (the preview lifts off from here) and the grab point.
      #blockRect: { left: number; top: number; width: number; height: number; layoutHeight: number } | null = null;
      #grabX = 0;
      #grabY = 0;
      #lastPointer: { clientX: number; clientY: number } | null = null;
      #scrollFrame: number | null = null;

      constructor(readonly view: EditorView) {}

      // Abort an in-flight drag when a concurrent/external edit lands — the stored indices would otherwise
      // resolve against a changed document on drop.
      update(update: ViewUpdate) {
        if (this.#sourceIndices && update.docChanged) {
          this.#stop();
        }
      }

      destroy() {
        // Skip the placeholder-clearing dispatch: destroy can run mid-update where dispatching would throw.
        this.#stop(false);
      }

      // Called from the gutter mousedown: arm a press that resolves to a click or a drag.
      arm(index: number, event: MouseEvent) {
        this.#armed = { index, shiftKey: event.shiftKey, x: event.clientX, y: event.clientY };
        window.addEventListener('mousemove', this.#onArmedMove);
        window.addEventListener('mouseup', this.#onArmedUp);
      }

      #disarm() {
        window.removeEventListener('mousemove', this.#onArmedMove);
        window.removeEventListener('mouseup', this.#onArmedUp);
        this.#armed = null;
      }

      #onArmedMove = (event: MouseEvent) => {
        if (!this.#armed) {
          return;
        }
        if (Math.abs(event.clientX - this.#armed.x) + Math.abs(event.clientY - this.#armed.y) > DRAG_THRESHOLD) {
          const { index } = this.#armed;
          this.#disarm();
          this.#beginDrag(index, event);
        }
      };

      #onArmedUp = () => {
        if (this.#armed) {
          const { index, shiftKey } = this.#armed;
          this.#disarm();
          this.#click(index, shiftKey);
        }
      };

      // A press without drag: move the caret to the end of the block (collapsing any text selection) and
      // update the block selection in the same transaction (so the field doesn't treat the caret move as a
      // clear). The block's `from` is its selection identity; the caret goes to its `to`.
      #click(index: number, shiftKey: boolean) {
        const block = getBlocks(this.view.state)[index];
        if (!block) {
          return;
        }
        const anchor = block.from;
        const current = this.view.state.field(blockSelectionField, false) ?? [];
        const effect = shiftKey
          ? toggleBlockSelection.of(anchor)
          : setBlockSelection.of(current.length === 1 && current[0] === anchor ? [] : [anchor]);
        this.view.dispatch({ selection: { anchor: block.to }, effects: effect });
      }

      // Enter drag mode: drag the whole block selection when the grabbed block is part of it, else just
      // the grabbed block.
      #beginDrag(index: number, event: MouseEvent) {
        const selected = getSelectedBlocks(this.view.state, getBlocks).map((entry) => entry.index);
        const indices = selected.length > 1 && selected.includes(index) ? selected : [index];
        this.#sourceIndices = indices;
        this.#dropIndex = indices[0];
        this.#grabX = event.clientX;
        this.#grabY = event.clientY;
        this.#lastPointer = { clientX: event.clientX, clientY: event.clientY };
        this.#blockRect = this.#measureBlock(indices[0]);
        this.#collapseHeights = indices.map((sourceIndex) => this.#measureCollapseHeight(sourceIndex));
        // Measure and clone before the collapse decoration removes the source from the DOM.
        this.#preview = this.#buildPreview(indices);
        if (this.#preview) {
          this.#preview.style.transform = 'none';
          const rect = this.#preview.getBoundingClientRect();
          this.#previewOrigin = { left: rect.left, top: rect.top };
        }
        this.#positionPreview(event.clientX, event.clientY);
        this.#updateDragDeco(this.#dropIndex);
        this.view.scrollDOM.classList.add('cm-blockDragging');
        window.addEventListener('mousemove', this.#onMove);
        window.addEventListener('mouseup', this.#onUp);
        this.#scrollFrame = requestAnimationFrame(this.#autoScrollTick);
      }

      #stop(clearPlaceholder = true) {
        this.#disarm();
        window.removeEventListener('mousemove', this.#onMove);
        window.removeEventListener('mouseup', this.#onUp);
        if (this.#scrollFrame != null) {
          cancelAnimationFrame(this.#scrollFrame);
          this.#scrollFrame = null;
        }
        this.view.scrollDOM.classList.remove('cm-blockDragging');
        if (clearPlaceholder && this.#placeholderKey != null) {
          this.view.dispatch({ effects: setDragDeco.of(null) });
        }
        this.#placeholderKey = null;
        this.#collapseHeights = [];
        this.#preview?.remove();
        this.#preview = null;
        this.#previewOrigin = null;
        this.#blockRect = null;
        this.#sourceIndices = null;
        this.#dropIndex = null;
        this.#lastPointer = null;
      }

      // Rendered height of the region a block's collapse hides: the block plus the blank line below it.
      #measureCollapseHeight(sourceIndex: number): number {
        const blocks = getBlocks(this.view.state);
        const source = blocks[sourceIndex];
        const firstRect = source && this.#lineRect(source.from);
        if (!source || !firstRect) {
          return 0;
        }
        if (sourceIndex + 1 >= blocks.length) {
          const lastRect = this.#lineRect(source.to);
          return lastRect ? lastRect.bottom - firstRect.top : 0;
        }
        const nextTop = this.#lineRect(blocks[sourceIndex + 1].from)?.top;
        return nextTop != null ? nextTop - firstRect.top : 0;
      }

      // The `.cm-line` DOM rect at `pos`, or null if the line isn't rendered.
      #lineRect(pos: number): DOMRect | null {
        const { node } = this.view.domAtPos(pos);
        const element = node instanceof Element ? node : node.parentElement;
        const lineElement = element?.closest('.cm-line');
        return lineElement ? lineElement.getBoundingClientRect() : null;
      }

      // The block's box rect in viewport coords, measured from its rendered `.cm-line` rects (the
      // `lineBlockAt` geometry drifts by a pixel or two). Falls back to `lineBlockAt` when off-screen.
      #measureBlock(sourceIndex: number): {
        left: number;
        top: number;
        width: number;
        height: number;
        layoutHeight: number;
      } | null {
        const block = getBlocks(this.view.state)[sourceIndex];
        if (!block) {
          return null;
        }

        const contentRect = this.view.contentDOM.getBoundingClientRect();
        const firstRect = this.#lineRect(block.from);
        const lastRect = this.#lineRect(block.to);
        if (firstRect && lastRect) {
          const layoutHeight = lastRect.bottom - firstRect.top;
          return {
            left: contentRect.left - BOX_INSET_X,
            top: firstRect.top - BOX_PADDING,
            width: contentRect.width + BOX_INSET_X,
            height: layoutHeight + BOX_PADDING * 2,
            layoutHeight,
          };
        }

        const firstLine = this.view.lineBlockAt(block.from);
        const lastLine = this.view.lineBlockAt(block.to);
        const layoutHeight = lastLine.bottom - firstLine.top;
        return {
          left: contentRect.left - BOX_INSET_X,
          top: contentRect.top + firstLine.top - BOX_PADDING,
          width: contentRect.width + BOX_INSET_X,
          height: layoutHeight + BOX_PADDING * 2,
          layoutHeight,
        };
      }

      // Clones the dragged blocks' rendered lines into a floating preview inside `.cm-editor`. A single
      // block is sized to its exact rect (pixel-perfect lift-off); multiple blocks stack at natural height.
      #buildPreview(sourceIndices: number[]): HTMLElement | null {
        const { state } = this.view;
        if (!this.#blockRect) {
          return null;
        }

        const preview = document.createElement('div');
        preview.className = 'cm-blockDragPreview';
        preview.style.width = `${this.#blockRect.width}px`;
        if (sourceIndices.length === 1) {
          preview.style.height = `${this.#blockRect.height}px`;
        }
        preview.style.paddingLeft = `${BOX_INSET_X}px`;

        const content = document.createElement('div');
        content.className = 'cm-lineWrapping';
        content.style.width = `${this.view.contentDOM.clientWidth}px`;
        content.style.transform = `translate(${PREVIEW_OFFSET.x}px, ${PREVIEW_OFFSET.y}px)`;

        const blocks = getBlocks(state);
        const seen = new Set<Element>();
        sourceIndices.forEach((sourceIndex, order) => {
          const block = blocks[sourceIndex];
          if (!block) {
            return;
          }
          if (order > 0) {
            const spacer = content.appendChild(document.createElement('div'));
            spacer.style.height = `${this.view.defaultLineHeight}px`;
          }
          const startLine = state.doc.lineAt(block.from).number;
          const endLine = state.doc.lineAt(block.to).number;
          for (let lineNumber = startLine; lineNumber <= endLine; lineNumber++) {
            const { node } = this.view.domAtPos(state.doc.line(lineNumber).from);
            const element = node instanceof Element ? node : node.parentElement;
            const lineElement = element?.closest('.cm-line');
            if (lineElement && !seen.has(lineElement)) {
              seen.add(lineElement);
              content.appendChild(lineElement.cloneNode(true));
            }
          }
        });

        preview.appendChild(content);
        return this.view.dom.appendChild(preview);
      }

      #positionPreview(clientX: number, clientY: number) {
        if (!this.#preview || !this.#previewOrigin || !this.#blockRect) {
          return;
        }
        const dx = clampX ? 0 : clientX - this.#grabX;
        const dy = clientY - this.#grabY;
        const left = this.#blockRect.left + dx - this.#previewOrigin.left;
        const top = this.#blockRect.top + dy - this.#previewOrigin.top;
        this.#preview.style.transform = `translate(${left}px, ${top}px)`;
      }

      // The slot the pointer is over: the first non-source block whose vertical midpoint is below the
      // pointer. The dragged (collapsed) blocks are skipped, so the drop gap — and thus the placeholder —
      // always lands on a visible block, above or below the pointer, never inside the lifted group.
      #dropIndexAt(clientY: number): number {
        const blocks = getBlocks(this.view.state);
        const sources = new Set(this.#sourceIndices ?? []);
        for (let index = 0; index < blocks.length; index++) {
          if (sources.has(index)) {
            continue;
          }
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

      #updateFromPointer() {
        if (!this.#lastPointer) {
          return;
        }
        this.#dropIndex = this.#dropIndexAt(this.#lastPointer.clientY);
        this.#updateDragDeco(this.#dropIndex);
        this.#positionPreview(this.#lastPointer.clientX, this.#lastPointer.clientY);
      }

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
        if (this.#sourceIndices == null || !this.#lastPointer) {
          return;
        }
        const delta = this.#autoScrollDelta(this.#lastPointer.clientY);
        if (delta !== 0) {
          const scroller = this.view.scrollDOM;
          const before = scroller.scrollTop;
          scroller.scrollTop = before + delta;
          if (scroller.scrollTop !== before) {
            this.#updateFromPointer();
          }
        }
        this.#scrollFrame = requestAnimationFrame(this.#autoScrollTick);
      };

      #onUp = () => {
        const sources = this.#sourceIndices;
        const drop = this.#dropIndex;
        this.#stop();
        if (sources != null && drop != null) {
          moveBlocks(this.view, sources, drop);
        }
      };

      // Collapses the dragged blocks out of the document and opens a gap at the drop slot. Skips the
      // dispatch when the drop position and collapse set are unchanged, so it only re-renders on a move.
      #updateDragDeco(dropIndex: number) {
        const sources = this.#sourceIndices;
        if (sources == null) {
          return;
        }
        const blocks = getBlocks(this.view.state);
        const collapses = sources
          .map((sourceIndex) => {
            const block = blocks[sourceIndex];
            const to = sourceIndex + 1 < blocks.length ? blocks[sourceIndex + 1].from : this.view.state.doc.length;
            return block ? { from: block.from, to } : null;
          })
          .filter((range): range is { from: number; to: number } => range != null);
        const totalHeight = this.#collapseHeights.reduce((sum, height) => sum + height, 0);
        const blockHeight =
          totalHeight - (this.#blockRect ? this.#collapseHeights[0] - this.#blockRect.layoutHeight : 0);
        if (totalHeight <= 0) {
          return;
        }

        // A side:-1 block widget sitting at a collapse's END is absorbed by the block-replace and renders
        // nothing (dropping onto the block right after a source). Snap such positions to that collapse's
        // START, which renders before it — the source's own slot, a no-op drop, so the position is right.
        let placeholderPos = dropIndex < blocks.length ? blocks[dropIndex].from : this.view.state.doc.length;
        const atCollapseEnd = collapses.find((range) => range.to === placeholderPos);
        if (atCollapseEnd) {
          placeholderPos = atCollapseEnd.from;
        }
        const key = `${placeholderPos}:${collapses.map((range) => range.from).join(',')}`;
        if (key === this.#placeholderKey) {
          return;
        }

        this.#placeholderKey = key;
        this.view.dispatch({ effects: setDragDeco.of({ collapses, placeholderPos, blockHeight, totalHeight }) });
      }
    },
  );

const dragTheme = EditorView.theme({
  '.cm-blockDragGutter': {
    width: '60px',
  },
  // Top-anchor the handle: the gutter element spans the block's full height, but the handle is sized to
  // the first row (see `DragHandleMarker`) so it centers on that line (body ~19px, heading ~45px).
  '.cm-blockDragGutter .cm-gutterElement': {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  '.cm-blockDragHandle': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'grab',
    color: 'var(--dx-description, currentColor)',
    opacity: '0.3',
    transition: 'opacity 0.2s',
    lineHeight: '1',
    fontSize: '20px',
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
  // Outer container reserves the full collapsed height (blocks + blanks) but is invisible; the blanks end
  // up as empty space below the bordered box.
  '.cm-blockDropPlaceholder': {
    pointerEvents: 'none',
  },
  '.cm-blockDropPlaceholderBox': {
    boxSizing: 'border-box',
    marginLeft: `-${BOX_INSET_X}px`,
    width: `calc(100% + ${BOX_INSET_X}px)`,
    borderRadius: '4px',
    border: '1px dashed var(--color-accent-text, #3b82f6)',
    backgroundColor: 'color-mix(in oklch, var(--color-accent-text, #3b82f6) 12%, transparent)',
  },
  '.cm-blockDragPreview': {
    position: 'absolute',
    top: '0',
    left: '0',
    zIndex: '6',
    pointerEvents: 'none',
    boxSizing: 'border-box',
    overflow: 'hidden',
    opacity: '0.9',
    borderRadius: '4px',
    border: '1px solid var(--color-primary-500)',
    padding: '1px 0',
    backgroundColor: 'var(--dx-base-surface, Canvas)',
    boxShadow: '0 8px 24px rgb(0 0 0 / 0.35)',
  },
});

/**
 * Drag-to-reorder for arbitrary document blocks, with click/shift-click block selection. The gutter shows
 * a single grip on the active block (the selection head or the first selected block); pressing it toggles
 * the block selection, dragging it reorders the block (or the whole selection). A floating preview, a
 * drop placeholder, and edge auto-scroll accompany the drag. Blocks and reorder semantics come from the
 * caller (see `blocks` for markdown blocks, and the outliner for task lines). Pairs with
 * `createBlockSelection`, which owns the selection state, highlight, and clipboard.
 */
export const createBlockDrag = ({
  getBlocks,
  moveBlocks,
  clampX = true,
  gutterClass = DEFAULT_GUTTER_CLASS,
}: BlockDragOptions): Extension => {
  const dragPlugin = createDragPlugin(getBlocks, moveBlocks, clampX);
  const dragGutter = gutter({
    class: gutterClass,
    markers: (view) => {
      const builder = new RangeSetBuilder<GutterMarker>();
      const blocks = getBlocks(view.state);
      for (const index of activeBlockIndices(view.state, getBlocks)) {
        const block = blocks[index];
        builder.add(block.from, block.from, new DragHandleMarker(firstRowHeight(view, block.from)));
      }
      return builder.finish();
    },
    // The active grip follows the selection/block-selection, so recompute markers when either changes.
    lineMarkerChange: (update) =>
      update.selectionSet ||
      update.startState.field(blockSelectionField, false) !== update.state.field(blockSelectionField, false),
    domEventHandlers: {
      mousedown: (view, line, event) => {
        // Primary button only; right/middle click must not reorder content.
        if (!(event instanceof MouseEvent) || event.button !== 0) {
          return false;
        }
        const blocks = getBlocks(view.state);
        const sourceIndex = blocks.findIndex((block) => block.from >= line.from && block.from <= line.to);
        if (sourceIndex < 0) {
          return false;
        }
        view.plugin(dragPlugin)?.arm(sourceIndex, event);
        event.preventDefault();
        return true;
      },
    },
  });

  return [dragTheme, dragDecoField, dragPlugin, dragGutter];
};
