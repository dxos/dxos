//
// Copyright 2026 DXOS.org
//

import { type EditorState, type Extension, StateEffect, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';

import { Domino } from '@dxos/ui';

import { blockSelectionField, getSelectedBlocks, setBlockSelection, toggleBlockSelection } from './selection';
import { type Block, type BlockExtent } from './types';

export type BlockDragOptions = {
  /**
   * Enumerates the draggable blocks for a state, in document order. Ranges must be non-overlapping so
   * the gutter, drop-index, and preview geometry stay unambiguous.
   */
  getBlocks: (state: EditorState) => Block[];
  /**
   * Moves the blocks at `sourceIndices` to the slot before `dropIndex` (the end of the document when
   * `dropIndex === blocks.length`), preserving their relative order, as a single edit. `indent` (from
   * `getDropIndent`, when provided) is the leading-space count the moved block(s) should re-root to.
   */
  moveBlocks: (view: EditorView, sourceIndices: number[], dropIndex: number, indent?: number) => void;
  /**
   * Resolves the drop target's indentation live during a drag: the leading-space count the dragged block(s)
   * would re-root to at `dropIndex` for the current `pointerY`, plus the horizontal pixel `offset` to shift
   * the preview so it previews that level. Omit for blocks whose drop never re-indents (markdown). The
   * outliner uses it to keep an item in its branch vs. outdenting it to a sibling of an ancestor.
   */
  getDropIndent?: (
    view: EditorView,
    sourceIndices: number[],
    dropIndex: number,
    pointerY: number,
  ) => { indent: number; offset: number } | null;
  /**
   * Pin the drag preview to the block's left edge so it only tracks vertically (default `true`).
   * When `false`, the preview follows the pointer on both axes.
   */
  clampX?: boolean;
  /**
   * Maps a block to the range it visually occupies for the collapse/preview/placeholder — its subtree for
   * the outliner. Defaults to the block's own range (markdown blocks). The grips and drop-index logic still
   * use `getBlocks` (own, non-overlapping ranges).
   */
  getExtent?: BlockExtent;
  /**
   * Collapse only the dragged block's content, keeping its trailing line break (default `false`, which
   * collapses through to the next block, consuming a blank-line separator). Set `true` for single-newline
   * separated blocks (the outliner): a block-replace that ends at the next line's start makes CodeMirror
   * attribute that line's `Decoration.line` (its indent) to the removed block, so the following item would
   * lose its indentation while dragging. Keeping the break ends the collapse at the content, preserving it.
   */
  keepTrailingBreak?: boolean;
};

// Merges sorted ranges, combining any that overlap or touch (nested subtree extents from a parent and its
// selected child would otherwise produce overlapping block-replace decorations).
const mergeRanges = (ranges: { from: number; to: number }[]): { from: number; to: number }[] => {
  const sorted = [...ranges].sort((a, b) => a.from - b.from);
  const merged: { from: number; to: number }[] = [];
  for (const range of sorted) {
    const last = merged.at(-1);
    if (last && range.from <= last.to) {
      last.to = Math.max(last.to, range.to);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
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

// Reserved strip (px) left of the content for the grip (mirrors the menu strip on the right); the grip is
// centered within it. 3rem.
const GUTTER = 48;

// Square grip size (px) and its drag-handle icon. Matches `dx-button` density `xs` + `aspect-square`
// (`size-6`), so the button's own box lines up with the centering math below.
const GRIP_SIZE = 24;
const GRIP_ICON = 'ph--dots-six-vertical--regular';

// A grip's target placement, computed in the measure read phase and applied in the write phase.
type GripPosition = { index: number; anchor: number; left: number; top: number };

// The `from` of the block under the pointer (a hovered block shows its grip), or null.
const setHoveredBlock = StateEffect.define<number | null>();
const hoveredBlockField = StateField.define<number | null>({
  create: () => null,
  update: (value, tr) => {
    for (const effect of tr.effects) {
      if (effect.is(setHoveredBlock)) {
        return effect.value;
      }
    }
    return value != null && tr.docChanged ? tr.changes.mapPos(value, -1) : value;
  },
});

// Tracks the block under the pointer (by its vertical position, so it works over the text, the gutter,
// or the margin) and publishes it to `hoveredBlockField` so that block's grip can show. Listens on the
// scroller — which spans the gutter and content — so moving from the text toward the grip doesn't clear
// it; the hover clears only when the pointer leaves the editor. Dispatches only when the block changes.
const createHoverPlugin = (getBlocks: BlockDragOptions['getBlocks'], dragPlugin: ReturnType<typeof createDragPlugin>) =>
  ViewPlugin.fromClass(
    class {
      constructor(readonly view: EditorView) {
        view.scrollDOM.addEventListener('mousemove', this.#onMove);
        view.scrollDOM.addEventListener('mouseleave', this.#onLeave);
      }

      destroy() {
        this.view.scrollDOM.removeEventListener('mousemove', this.#onMove);
        this.view.scrollDOM.removeEventListener('mouseleave', this.#onLeave);
      }

      #set(anchor: number | null) {
        if (anchor !== (this.view.state.field(hoveredBlockField, false) ?? null)) {
          this.view.dispatch({ effects: setHoveredBlock.of(anchor) });
        }
      }

      #onMove = (event: MouseEvent) => {
        // While a drag is in flight the pointer sweeps across rows; updating the hovered block here would
        // flicker other rows' grips on and off. The drag plugin owns which grip shows during a drag.
        if (this.view.plugin(dragPlugin)?.dragging) {
          return;
        }
        // Map the pointer's row (content-center x + pointer y) to a block, so any horizontal position works.
        const contentRect = this.view.contentDOM.getBoundingClientRect();
        const pos = this.view.posAtCoords({ x: contentRect.left + contentRect.width / 2, y: event.clientY });
        this.#set(
          pos == null
            ? null
            : (getBlocks(this.view.state).find((block) => pos >= block.from && pos <= block.to)?.from ?? null),
        );
      };

      #onLeave = () => this.#set(null);
    },
  );

// The single block whose grip is shown: the block under the pointer, else the block at the caret (only
// one handle is ever visible). Grabbing it drags the whole block selection when it is part of one.
const activeBlockIndex = (state: EditorState, getBlocks: BlockDragOptions['getBlocks']): number | null => {
  const blocks = getBlocks(state);
  const hovered = state.field(hoveredBlockField, false);
  if (hovered != null) {
    const hoverIndex = blocks.findIndex((block) => block.from === hovered);
    if (hoverIndex >= 0) {
      return hoverIndex;
    }
  }
  const head = state.selection.main.head;
  const cursorIndex = blocks.findIndex((block) => head >= block.from && head <= block.to);
  return cursorIndex >= 0 ? cursorIndex : null;
};

// Builds a grip element (outer `dx-button` + inner phosphor glyph). Shared by the floating overlay and the
// drag preview; callers attach behavior and position it.
const createGripElement = (): HTMLElement =>
  Domino.of('div')
    .classNames('dx-button aspect-square cm-blockDragHandle')
    .attributes({ 'data-variant': 'ghost', 'data-density': 'xs' })
    .append(Domino.of('div').classNames('cm-blockDragHandleIcon').append(Domino.svg(GRIP_ICON))).root;

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
  getExtent?: BlockExtent,
  keepTrailingBreak = false,
  getDropIndent?: BlockDragOptions['getDropIndent'],
) =>
  ViewPlugin.fromClass(
    class {
      // Armed but not yet dragging: the press that may become a click or a drag.
      #armed: { index: number; shiftKey: boolean; x: number; y: number } | null = null;

      // Active drag state (null until a press crosses the drag threshold).
      #sourceIndices: number[] | null = null;
      #dropIndex: number | null = null;
      // Resolved drop indentation for the current pointer (from `getDropIndent`), or null when the block
      // kind does not re-indent on drop. `offset` shifts the preview to preview the target level.
      #dropIndent: { indent: number; offset: number } | null = null;
      #collapseHeights: number[] = [];
      #placeholderKey: string | null = null;
      #preview: HTMLElement | null = null;
      // The cloned content inside the preview; indented (within the fixed container) to preview the drop level.
      #previewContent: HTMLElement | null = null;
      #previewOrigin: { left: number; top: number } | null = null;
      // A grip that rides along with the preview so a drag handle stays visible while dragging (the static
      // overlay grip is hidden during a drag). `#gripOrigin` is its resting viewport position at grab time.
      #previewGrip: HTMLElement | null = null;
      #gripOrigin: { left: number; top: number } | null = null;
      // The first dragged block's viewport rect (the preview lifts off from here) and the grab point.
      #blockRect: { left: number; top: number; width: number; height: number; layoutHeight: number } | null = null;
      #grabX = 0;
      #grabY = 0;
      #lastPointer: { clientX: number; clientY: number } | null = null;
      #scrollFrame: number | null = null;

      constructor(readonly view: EditorView) {}

      // True once a press has crossed the drag threshold and a reorder is in flight.
      get dragging(): boolean {
        return this.#sourceIndices != null;
      }

      // The block indices being dragged (null when not dragging).
      get sourceIndices(): number[] | null {
        return this.#sourceIndices;
      }

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
      // clear). A plain press toggles a single-block selection — selecting only this block, or clearing it
      // when it is already the sole selection; shift toggles it within the set. The block's `from` is its
      // selection identity; the caret goes to its `to`.
      #click(index: number, shiftKey: boolean) {
        const block = getBlocks(this.view.state)[index];
        if (!block) {
          return;
        }
        const anchor = block.from;
        let effect;
        if (shiftKey) {
          effect = toggleBlockSelection.of(anchor);
        } else {
          const current = this.view.state.field(blockSelectionField, false) ?? [];
          const isSoleSelection = current.length === 1 && current[0] === anchor;
          effect = setBlockSelection.of(isSoleSelection ? [] : [anchor]);
        }
        this.view.dispatch({ selection: { anchor: block.to }, effects: effect });
      }

      // Enter drag mode: drag the whole block selection when the grabbed block is part of it, else just
      // the grabbed block. Grabbing a block outside the current selection shifts the selection to it, so
      // the dragged block shows as selected immediately.
      #beginDrag(index: number, event: MouseEvent) {
        const selected = getSelectedBlocks(this.view.state, getBlocks).map((entry) => entry.index);
        const indices = selected.length > 1 && selected.includes(index) ? selected : [index];
        if (!selected.includes(index)) {
          const block = getBlocks(this.view.state)[index];
          if (block) {
            this.view.dispatch({ effects: setBlockSelection.of([block.from]) });
          }
        }
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
        // A grip rides with the preview: hidden as the static overlay grip, re-shown here at the same
        // resting spot (gutter-centered, on the first row) and translated by the pointer delta each move.
        this.#gripOrigin = this.#measureGripOrigin(indices[0]);
        if (this.#gripOrigin) {
          this.#previewGrip = createGripElement();
          this.#previewGrip.classList.add('cm-blockDragPreviewHandle');
          this.view.dom.appendChild(this.#previewGrip);
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
        this.#previewContent = null;
        this.#previewOrigin = null;
        this.#previewGrip?.remove();
        this.#previewGrip = null;
        this.#gripOrigin = null;
        this.#blockRect = null;
        this.#sourceIndices = null;
        this.#dropIndex = null;
        this.#dropIndent = null;
        this.#lastPointer = null;
      }

      // The range the block at `sourceIndex` visually occupies (its subtree for the outliner, else its own
      // range).
      #extentOf(sourceIndex: number): Block | null {
        const block = getBlocks(this.view.state)[sourceIndex];
        if (!block) {
          return null;
        }
        return getExtent ? getExtent(this.view.state, block) : block;
      }

      // Start of the first block after `pos`, or the document end when there is none — the point a collapse
      // extends to so it swallows the trailing blank/separator.
      #nextStartAfter(pos: number): number {
        const next = getBlocks(this.view.state).find((block) => block.from > pos);
        return next ? next.from : this.view.state.doc.length;
      }

      // Rendered height of the region a block's collapse hides: the block (its extent) plus the blank line
      // below it.
      #measureCollapseHeight(sourceIndex: number): number {
        const extent = this.#extentOf(sourceIndex);
        const firstRect = extent && this.#lineRect(extent.from);
        if (!extent || !firstRect) {
          return 0;
        }
        const nextStart = this.#nextStartAfter(extent.to);
        if (nextStart >= this.view.state.doc.length) {
          const lastRect = this.#lineRect(extent.to);
          return lastRect ? lastRect.bottom - firstRect.top : 0;
        }
        const nextTop = this.#lineRect(nextStart)?.top;
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
        const extent = this.#extentOf(sourceIndex);
        if (!extent) {
          return null;
        }

        const contentRect = this.view.contentDOM.getBoundingClientRect();
        const firstRect = this.#lineRect(extent.from);
        const lastRect = this.#lineRect(extent.to);
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

        const firstLine = this.view.lineBlockAt(extent.from);
        const lastLine = this.view.lineBlockAt(extent.to);
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

        const seen = new Set<Element>();
        sourceIndices.forEach((sourceIndex, order) => {
          const extent = this.#extentOf(sourceIndex);
          if (!extent) {
            return;
          }
          if (order > 0) {
            const spacer = content.appendChild(document.createElement('div'));
            spacer.style.height = `${this.view.defaultLineHeight}px`;
          }
          const startLine = state.doc.lineAt(extent.from).number;
          const endLine = state.doc.lineAt(extent.to).number;
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
        // Held so the drop-level preview indents the content within the (unmoved) container.
        this.#previewContent = content;
        return this.view.dom.appendChild(preview);
      }

      // The grip's resting viewport position for the block at `sourceIndex`: gutter-centered horizontally
      // (matching the static overlay grip) and centered on the block's first row.
      #measureGripOrigin(sourceIndex: number): { left: number; top: number } | null {
        const block = getBlocks(this.view.state)[sourceIndex];
        const coords = block && this.view.coordsAtPos(block.from);
        if (!coords) {
          return null;
        }
        const contentRect = this.view.contentDOM.getBoundingClientRect();
        return {
          left: contentRect.left - GUTTER / 2 - GRIP_SIZE / 2,
          top: (coords.top + coords.bottom) / 2 - GRIP_SIZE / 2,
        };
      }

      #positionPreview(clientX: number, clientY: number) {
        const dx = clampX ? 0 : clientX - this.#grabX;
        const dy = clientY - this.#grabY;
        if (this.#preview && this.#previewOrigin && this.#blockRect) {
          const left = this.#blockRect.left + dx - this.#previewOrigin.left;
          const top = this.#blockRect.top + dy - this.#previewOrigin.top;
          this.#preview.style.transform = `translate(${left}px, ${top}px)`;
        }
        // Preview the target indent level (from `getDropIndent`) by indenting the content WITHIN the
        // container — the container and grip stay put, only the text shifts to show where it will land.
        if (this.#previewContent) {
          const indentOffset = this.#dropIndent?.offset ?? 0;
          this.#previewContent.style.transform = `translate(${PREVIEW_OFFSET.x + indentOffset}px, ${PREVIEW_OFFSET.y}px)`;
        }
        if (this.#previewGrip && this.#gripOrigin) {
          this.#previewGrip.style.left = `${this.#gripOrigin.left + dx}px`;
          this.#previewGrip.style.top = `${this.#gripOrigin.top + dy}px`;
        }
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
        if (!this.#lastPointer || this.#sourceIndices == null) {
          return;
        }
        this.#dropIndex = this.#dropIndexAt(this.#lastPointer.clientY);
        this.#dropIndent =
          getDropIndent?.(this.view, this.#sourceIndices, this.#dropIndex, this.#lastPointer.clientY) ?? null;
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
        const indent = this.#dropIndent?.indent;
        this.#stop();
        if (sources != null && drop != null) {
          moveBlocks(this.view, sources, drop, indent);
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
        // Collapse each dragged block's extent (its subtree for the outliner) plus its trailing separator,
        // merged so nested/adjacent extents don't produce overlapping block-replace decorations.
        const collapses = mergeRanges(
          sources
            .map((sourceIndex) => {
              const extent = this.#extentOf(sourceIndex);
              // Collapse through the separator (next block start) for blank-line separated blocks, or stop
              // at the content end for single-newline blocks so the next line keeps its decoration (indent).
              return extent
                ? { from: extent.from, to: keepTrailingBreak ? extent.to : this.#nextStartAfter(extent.to) }
                : null;
            })
            .filter((range): range is { from: number; to: number } => range != null),
        );
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
  // The grip is a floating overlay (see `createGripOverlay`) pinned just left of the content, so it tracks
  // a centered content column — a CodeMirror gutter is stuck at the scroller edge and can't. Positioned
  // via fixed coordinates (viewport space), refreshed on layout/scroll. `dx-button` supplies the hover
  // affordance; this only pins/sizes it.
  '.cm-blockDragHandle': {
    position: 'fixed',
    zIndex: '5',
    cursor: 'grab',
  },
  '.cm-blockDragHandleIcon': {
    display: 'grid',
    placeContent: 'center',
    fontSize: '16px',
    color: 'var(--color-description, currentColor)',
    opacity: '0.4',
    transition: 'opacity 0.2s',
  },
  '.cm-blockDragHandle:hover .cm-blockDragHandleIcon': {
    opacity: '1',
  },
  // The grip carried by the drag preview: above the preview, fully opaque, non-interactive.
  '.cm-blockDragPreviewHandle': {
    zIndex: '7',
    cursor: 'grabbing',
    pointerEvents: 'none',
  },
  '.cm-blockDragPreviewHandle .cm-blockDragHandleIcon': {
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
    padding: '1px 0',
    backgroundColor: 'var(--color-base-surface, Canvas)',
    boxShadow: '0 8px 24px rgb(0 0 0 / 0.35)',
  },
});

/**
 * Drag-to-reorder for arbitrary document blocks, with click/shift-click block selection. The gutter shows
 * a grip on the block under the pointer, the block at the caret, and every selected block; pressing a grip
 * toggles the block selection, dragging it reorders the block (or the whole selection). A floating
 * preview, a drop placeholder, and edge auto-scroll accompany the drag. Blocks and reorder semantics come
 * from the caller (see `blocks` for markdown blocks, and the outliner for task lines). Pairs with
 * `createBlockSelection`, which owns the selection state, highlight, and clipboard.
 */
export const createBlockDrag = ({
  getBlocks,
  moveBlocks,
  clampX = true,
  getExtent,
  keepTrailingBreak = false,
  getDropIndent,
}: BlockDragOptions): Extension => {
  const dragPlugin = createDragPlugin(getBlocks, moveBlocks, clampX, getExtent, keepTrailingBreak, getDropIndent);
  return [
    dragTheme,
    dragDecoField,
    hoveredBlockField,
    createHoverPlugin(getBlocks, dragPlugin),
    dragPlugin,
    createGripOverlay(getBlocks, dragPlugin),
  ];
};

/**
 * Floating grip overlay, one per active block (caret / hovered / selected), pinned just left of the
 * content's left edge — unlike a CodeMirror gutter (stuck at the scroller edge) it tracks a `max-width` +
 * `mx-auto` centered content column. Positions come from `coordsAtPos` (real DOM geometry, not the height
 * map) and refresh on layout and scroll; presses arm the drag plugin. Grips whose row is scrolled out of
 * the editor are dropped.
 */
const createGripOverlay = (
  getBlocks: BlockDragOptions['getBlocks'],
  dragPlugin: ReturnType<typeof createDragPlugin>,
): Extension =>
  ViewPlugin.fromClass(
    class {
      // Grip elements keyed by the block anchor they mark; rebuilt as the active set changes.
      #grips = new Map<number, HTMLElement>();
      constructor(readonly view: EditorView) {
        view.scrollDOM.addEventListener('scroll', this.#onScroll);
        this.#schedule();
      }

      update(update: ViewUpdate) {
        const selectionChanged =
          update.startState.field(blockSelectionField, false) !== update.state.field(blockSelectionField, false);
        const hoverChanged =
          update.startState.field(hoveredBlockField, false) !== update.state.field(hoveredBlockField, false);
        if (
          update.geometryChanged ||
          update.docChanged ||
          update.viewportChanged ||
          update.selectionSet ||
          selectionChanged ||
          hoverChanged
        ) {
          this.#schedule();
        }
      }

      destroy() {
        this.view.scrollDOM.removeEventListener('scroll', this.#onScroll);
        for (const grip of this.#grips.values()) {
          grip.remove();
        }
        this.#grips.clear();
      }

      #onScroll = () => this.#schedule();

      // A keyed measure runs in CodeMirror's measure cycle — after layout, including the initial one — so
      // `coordsAtPos` is valid (unlike a bare `rAF` fired before first layout). Requests coalesce by key.
      #measure = {
        key: this,
        read: (view: EditorView): GripPosition[] => this.#read(view),
        write: (positions: GripPosition[]) => this.#write(positions),
      };

      #schedule() {
        this.view.requestMeasure(this.#measure);
      }

      #read(view: EditorView): GripPosition[] {
        // While dragging, the static grip is hidden — the drag preview carries its own handle instead.
        if (view.plugin(dragPlugin)?.dragging) {
          return [];
        }
        const index = activeBlockIndex(view.state, getBlocks);
        if (index == null) {
          return [];
        }
        const block = getBlocks(view.state)[index];
        const coords = block && view.coordsAtPos(block.from);
        const scrollRect = view.scrollDOM.getBoundingClientRect();
        // Drop the grip when its first row is scrolled out of the editor viewport.
        if (!coords || coords.bottom <= scrollRect.top || coords.top >= scrollRect.bottom) {
          return [];
        }
        // Centered within the 3rem gutter immediately left of the content.
        const contentRect = view.contentDOM.getBoundingClientRect();
        const left = contentRect.left - GUTTER / 2 - GRIP_SIZE / 2;
        return [{ index, anchor: block.from, left, top: (coords.top + coords.bottom) / 2 - GRIP_SIZE / 2 }];
      }

      #write(positions: GripPosition[]) {
        const active = new Set<number>();
        for (const { index, anchor, left, top } of positions) {
          active.add(index);
          let grip = this.#grips.get(index);
          if (!grip) {
            grip = this.#createGrip();
            this.#grips.set(index, grip);
          }
          grip.dataset.anchor = String(anchor);
          grip.style.left = `${left}px`;
          grip.style.top = `${top}px`;
        }
        for (const [index, grip] of this.#grips) {
          if (!active.has(index)) {
            grip.remove();
            this.#grips.delete(index);
          }
        }
      }

      #createGrip(): HTMLElement {
        const grip = createGripElement();
        grip.addEventListener('mousedown', (event) => {
          if (event.button !== 0) {
            return;
          }
          // Resolve the block from the grip's anchor at press time (indices shift as the doc changes).
          const anchor = Number(grip.dataset.anchor);
          const sourceIndex = getBlocks(this.view.state).findIndex((entry) => entry.from === anchor);
          if (sourceIndex < 0) {
            return;
          }
          this.view.plugin(dragPlugin)?.arm(sourceIndex, event);
          event.preventDefault();
        });
        this.view.scrollDOM.appendChild(grip);
        return grip;
      }
    },
  );
