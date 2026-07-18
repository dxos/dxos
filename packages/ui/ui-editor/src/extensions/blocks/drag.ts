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
  WidgetType,
  gutter,
} from '@codemirror/view';

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
   * Moves the block at `sourceIndex` to the slot before `dropIndex` (or the end of the document when
   * `dropIndex === blocks.length`). Indices refer to the array returned by `getBlocks`.
   */
  moveBlock: (view: EditorView, sourceIndex: number, dropIndex: number) => void;
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
// Vertical needs no fudge: the preview's border + padding inset equals `BOX_PADDING`, so the cloned text
// lands exactly on the source line measured by `#measureBlock`.
const PREVIEW_OFFSET = { x: -1, y: 0 };

// Distance (px) from the viewport's top/bottom edge within which a drag auto-scrolls the editor.
const AUTOSCROLL_ZONE = 48;

// Maximum auto-scroll speed (px per animation frame), reached at the very edge and ramped down to 0
// at the far side of the zone.
const AUTOSCROLL_MAX_SPEED = 14;

const DEFAULT_GUTTER_CLASS = 'cm-blockDragGutter';

/** Gutter grip anchored to a block's first line; mousedown starts a drag. */
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
// `coordsAtPos`), so the gutter's `markers` callback can call it directly, with no async measure/dispatch.
// A heading occupies a single tall row, so its whole line-block height is the row height; every other
// block's first row is the default line height (a wrapped paragraph's first row, a list item, etc.).
const firstRowHeight = (view: EditorView, pos: number): number => {
  const node = syntaxTree(view.state).resolveInner(pos, 1);
  for (let current: typeof node | null = node; current; current = current.parent) {
    if (/Heading/.test(current.name)) {
      return view.lineBlockAt(pos).height;
    }
  }
  return view.defaultLineHeight;
};

// The in-progress drag's decorations, or `null` when idle: the dragged block — together with its
// trailing separator (the blank line below it) — is collapsed out of the document (`collapseFrom`..
// `collapseTo`), and a block-height gap (`placeholderPos`) opens at the drop slot, so the content closes
// fully over the lifted block (no orphaned blank line) and reopens at the landing spot.
type DragDecoState = {
  collapseFrom: number;
  collapseTo: number;
  placeholderPos: number;
  // Height of the bordered box (the block) and the total reserved height (block + trailing blank line);
  // the difference is empty space rendered below the box, matching the collapsed separator.
  blockHeight: number;
  totalHeight: number;
} | null;

const setDragDeco = StateEffect.define<DragDecoState>();

/**
 * Block-level spacer rendered at the drop position. The outer element reserves the full collapsed
 * height (block + trailing blank line) so nothing shifts; the inner box carries the border and matches
 * just the block, leaving the blank line as empty space below the border.
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
          const { collapseFrom, collapseTo, placeholderPos, blockHeight, totalHeight } = effect.value;
          next = Decoration.set(
            [
              // Collapse the dragged block (and its trailing blank line) out of the document flow.
              Decoration.replace({ block: true }).range(collapseFrom, collapseTo),
              // Open the gap at the drop slot (before the target line, or after the last line).
              Decoration.widget({
                widget: new PlaceholderWidget(blockHeight, totalHeight),
                block: true,
                side: placeholderPos >= tr.state.doc.length ? 1 : -1,
              }).range(placeholderPos),
            ],
            // Sort: the placeholder may precede or follow the collapsed source.
            true,
          );
        }
      }
    }
    return next;
  },
  provide: (field) => EditorView.decorations.from(field),
});

/** Manages an in-progress block drag: the drop placeholder and the pointer tracking. */
const createDragPlugin = (
  getBlocks: BlockDragOptions['getBlocks'],
  moveBlock: BlockDragOptions['moveBlock'],
  clampX: boolean,
) =>
  ViewPlugin.fromClass(
    class {
      #sourceIndex: number | null = null;
      #dropIndex: number | null = null;
      // The dragged block's range, captured at drag start so the collapse decoration is stable.
      #sourceBlock: Block | null = null;
      // Rendered height of the collapsed region (the block plus its trailing blank line), captured at
      // start. The placeholder uses it so collapse and placeholder cancel exactly — no content shift.
      #collapseHeight = 0;
      // Document position of the currently-rendered drop placeholder, or null when none is shown.
      #placeholderPos: number | null = null;
      #preview: HTMLElement | null = null;
      // The preview's natural (untranslated) top-left in viewport coords; overlays translate from here to
      // viewport targets, so placement is exact regardless of any transformed/scrolled ancestor.
      #previewOrigin: { left: number; top: number } | null = null;
      // The dragged block's viewport rect (the preview lifts off from here) and the grab point.
      // `height` includes the outline box padding (preview box size); `layoutHeight` is the block's
      // actual document height (what the collapse removes), used to size the placeholder so the collapse
      // and placeholder cancel exactly and nothing shifts.
      #blockRect: { left: number; top: number; width: number; height: number; layoutHeight: number } | null = null;
      #grabX = 0;
      #grabY = 0;
      // Latest pointer position, so the auto-scroll loop can re-evaluate the drop target and preview
      // between mouse moves (the pointer holds still at the edge while the content scrolls under it).
      #lastPointer: { clientX: number; clientY: number } | null = null;
      #scrollFrame: number | null = null;

      constructor(readonly view: EditorView) {}

      destroy() {
        // Skip the placeholder-clearing dispatch: destroy can run mid-update (view teardown/reconfigure),
        // where dispatching would throw.
        this.#stop(false);
      }

      startDrag(sourceIndex: number, event: MouseEvent) {
        this.#sourceIndex = sourceIndex;
        this.#dropIndex = sourceIndex;
        this.#grabX = event.clientX;
        this.#grabY = event.clientY;
        this.#lastPointer = { clientX: event.clientX, clientY: event.clientY };
        this.#blockRect = this.#measureBlock(sourceIndex);
        this.#sourceBlock = getBlocks(this.view.state)[sourceIndex] ?? null;
        this.#collapseHeight = this.#measureCollapseHeight(sourceIndex);
        // Measure and clone the source BEFORE the collapse decoration removes it from the DOM.
        this.#preview = this.#buildPreview(sourceIndex);
        if (this.#preview) {
          // The preview sits at `top:0/left:0` in `.cm-editor`, so `#positionPreview` translates from
          // this measured origin to the viewport target.
          this.#preview.style.transform = 'none';
          const rect = this.#preview.getBoundingClientRect();
          this.#previewOrigin = { left: rect.left, top: rect.top };
        }
        this.#positionPreview(event.clientX, event.clientY); // Lift off exactly over the source block (zero delta).
        this.#updateDragDeco(sourceIndex);
        this.view.scrollDOM.classList.add('cm-blockDragging');
        window.addEventListener('mousemove', this.#onMove);
        window.addEventListener('mouseup', this.#onUp);
        this.#scrollFrame = requestAnimationFrame(this.#autoScrollTick);
      }

      #stop(clearPlaceholder = true) {
        window.removeEventListener('mousemove', this.#onMove);
        window.removeEventListener('mouseup', this.#onUp);
        if (this.#scrollFrame != null) {
          cancelAnimationFrame(this.#scrollFrame);
          this.#scrollFrame = null;
        }
        this.view.scrollDOM.classList.remove('cm-blockDragging');
        if (clearPlaceholder && this.#placeholderPos != null) {
          this.view.dispatch({ effects: setDragDeco.of(null) });
        }
        this.#placeholderPos = null;
        this.#sourceBlock = null;
        this.#collapseHeight = 0;
        this.#preview?.remove();
        this.#preview = null;
        this.#previewOrigin = null;
        this.#blockRect = null;
        this.#sourceIndex = null;
        this.#dropIndex = null;
        this.#lastPointer = null;
      }

      // Rendered height of the region the collapse decoration hides: the source block plus the blank
      // line below it (down to the next block's first line). The last block has no block below, so it
      // falls back to the block's own height.
      #measureCollapseHeight(sourceIndex: number): number {
        const blocks = getBlocks(this.view.state);
        const source = blocks[sourceIndex];
        const fallback = this.#blockRect?.layoutHeight ?? 0;
        if (!source) {
          return fallback;
        }
        if (sourceIndex + 1 >= blocks.length) {
          return fallback;
        }
        const sourceTop = this.#lineRect(source.from)?.top;
        const nextTop = this.#lineRect(blocks[sourceIndex + 1].from)?.top;
        return sourceTop != null && nextTop != null ? nextTop - sourceTop : fallback;
      }

      // The `.cm-line` DOM rect at `pos`, or null if the line isn't rendered.
      #lineRect(pos: number): DOMRect | null {
        const { node } = this.view.domAtPos(pos);
        const element = node.nodeType === 1 ? (node as Element) : node.parentElement;
        const lineElement = element?.closest('.cm-line');
        return lineElement ? lineElement.getBoundingClientRect() : null;
      }

      // The dragged block's box rect in viewport coords. Measured from the block's rendered `.cm-line`
      // rects (not the `lineBlockAt` geometry, which drifts from the actual render by a pixel or two) so
      // the cloned preview lifts off exactly over the source text — with no per-block vertical fudge.
      // Falls back to `lineBlockAt` when the lines aren't rendered (e.g. block scrolled off-screen).
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

      // Clones the dragged block's rendered lines into a floating preview inside `.cm-editor` (so the
      // editor's theme styles apply to the clone), sized to the block's on-screen rect.
      #buildPreview(sourceIndex: number): HTMLElement | null {
        const { state } = this.view;
        const block = getBlocks(state)[sourceIndex];
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
        // nudges only the text — the box border stays aligned with the source block. It must wrap exactly
        // like the source: pin the width to the source content width, and carry the `cm-lineWrapping`
        // class so the clones inherit the same `white-space`/`word-break` (a plain div defaults to
        // `white-space: normal` and re-breaks the lines at different points).
        const content = document.createElement('div');
        content.className = 'cm-lineWrapping';
        content.style.width = `${this.view.contentDOM.clientWidth}px`;
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
        const dx = clampX ? 0 : clientX - this.#grabX;
        const dy = clientY - this.#grabY;
        const left = this.#blockRect.left + dx - this.#previewOrigin.left;
        const top = this.#blockRect.top + dy - this.#previewOrigin.top;
        this.#preview.style.transform = `translate(${left}px, ${top}px)`;
      }

      // The slot the pointer is over: the first block whose vertical midpoint is below the pointer.
      #dropIndexAt(clientY: number): number {
        const blocks = getBlocks(this.view.state);
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
        this.#updateDragDeco(this.#dropIndex);
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

      // Collapses the dragged block (plus its trailing blank line) out of the document and opens a
      // block-height gap at the drop slot (see `dragDecoField`). Called on start with `dropIndex ===
      // sourceIndex`, so the lifted block's slot is backfilled by the placeholder. Skips the dispatch
      // when the drop position is unchanged, so it only re-renders on a move.
      #updateDragDeco(dropIndex: number) {
        const source = this.#sourceBlock;
        const sourceIndex = this.#sourceIndex;
        // The bordered box matches the block; the total reserves the whole collapsed region (block +
        // trailing blank line) so it backfills what the collapse removes — no content shift.
        const blockHeight = this.#blockRect?.layoutHeight ?? 0;
        const totalHeight = this.#collapseHeight;
        if (source == null || sourceIndex == null || totalHeight <= 0) {
          return;
        }

        const blocks = getBlocks(this.view.state);
        // Collapse from the block start through to the next block, so any blank-line separator below the
        // dragged block is hidden too (leaving no orphaned gap). The last block has no block below it.
        const collapseFrom = source.from;
        const collapseTo = sourceIndex + 1 < blocks.length ? blocks[sourceIndex + 1].from : this.view.state.doc.length;
        const placeholderPos = dropIndex < blocks.length ? blocks[dropIndex].from : this.view.state.doc.length;
        if (placeholderPos === this.#placeholderPos) {
          return;
        }

        this.#placeholderPos = placeholderPos;
        this.view.dispatch({
          effects: setDragDeco.of({ collapseFrom, collapseTo, placeholderPos, blockHeight, totalHeight }),
        });
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
  // Outer container reserves the full collapsed height (block + blank line) but is invisible; the blank
  // line ends up as empty space below the bordered box.
  '.cm-blockDropPlaceholder': {
    pointerEvents: 'none',
  },
  '.cm-blockDropPlaceholderBox': {
    boxSizing: 'border-box',
    // Align with the block outline boxes and the drag preview, which extend `BOX_INSET_X` left of the
    // text (the box otherwise sits flush with the text, indenting it relative to the boxes).
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
    // Explicit block-matched height with the border inside it, so the preview matches the source size.
    boxSizing: 'border-box',
    overflow: 'hidden',
    opacity: '0.9',
    borderRadius: '4px',
    border: '1px solid var(--color-primary-500)',
    // Sink the cloned lines to `BOX_PADDING` below the box top (matching the source text), accounting
    // for the 1px border — so the preview text overlays the source text exactly.
    padding: '1px 0',
    backgroundColor: 'var(--dx-base-surface, Canvas)',
    boxShadow: '0 8px 24px rgb(0 0 0 / 0.35)',
  },
});

/**
 * Drag-to-reorder for arbitrary document blocks. Adds a gutter of grip handles (one per block) and,
 * while a handle is dragged, a floating preview of the block, a block-height drop placeholder that
 * opens at the landing spot, and edge auto-scroll. On drop the configured `moveBlock` relocates the
 * block. The blocks and the reorder semantics are supplied by the caller (see `blocks` for markdown
 * top-level blocks, and the outliner for task lines).
 */
export const createBlockDrag = ({
  getBlocks,
  moveBlock,
  clampX = true,
  gutterClass = DEFAULT_GUTTER_CLASS,
}: BlockDragOptions): Extension => {
  const dragPlugin = createDragPlugin(getBlocks, moveBlock, clampX);
  const dragGutter = gutter({
    class: gutterClass,
    markers: (view) => {
      const builder = new RangeSetBuilder<GutterMarker>();
      for (const block of getBlocks(view.state)) {
        // Size the grip to the block's first row so it centers on that line (see `firstRowHeight`).
        builder.add(block.from, block.from, new DragHandleMarker(firstRowHeight(view, block.from)));
      }
      return builder.finish();
    },
    domEventHandlers: {
      mousedown: (view, line, event) => {
        if (!(event instanceof MouseEvent)) {
          return false;
        }
        const blocks = getBlocks(view.state);
        const sourceIndex = blocks.findIndex((block) => block.from >= line.from && block.from <= line.to);
        if (sourceIndex < 0) {
          return false;
        }
        view.plugin(dragPlugin)?.startDrag(sourceIndex, event);
        event.preventDefault();
        return true;
      },
    },
  });

  return [dragTheme, dragDecoField, dragPlugin, dragGutter];
};
