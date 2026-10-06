//
// Copyright 2024 DXOS.org
//

import { Annotation, type Extension, type Range, RangeSet, StateEffect, StateField } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  type PluginValue,
  type Tooltip,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
  showTooltip,
} from '@codemirror/view';

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';

import { Cursor, type CursorConverter, singleValueFacet } from '../../../util/index.ts';

export interface AwarenessProvider {
  remoteStateChange: Event<void>;

  open(): void;
  close(): void;

  getRemoteStates(): AwarenessState[];
  update(position: AwarenessPosition | undefined): void;
}

export type AwarenessPosition = {
  anchor?: string;
  head?: string;
};

export type AwarenessInfo = {
  displayName: string;
  darkColor: string;
  lightColor: string;
};

export type AwarenessState = {
  position?: AwarenessPosition;
  peerId: string;
  info: AwarenessInfo;
};

/**
 * Extension provides presence information about other peers.
 */
export const awareness = (provider = dummyProvider): Extension => {
  return [
    awarenessProvider.of(provider),
    ViewPlugin.fromClass(RemoteSelectionsDecorator, {
      decorations: (value) => value.decorations,
    }),
    hoveredCaret,
    styles,
  ];
};

const dummyProvider: AwarenessProvider = {
  remoteStateChange: new Event(),

  open: () => {},
  close: () => {},

  getRemoteStates: () => [],
  update: () => {},
};

/**
 * Single-value facet supplying the AwarenessProvider consumed by the awareness extension.
 */
export const awarenessProvider = singleValueFacet<AwarenessProvider>(dummyProvider);

// TODO(dmaretskyi): Specify the users that actually changed. Currently, we recalculate positions for every user.
const RemoteSelectionChangedAnnotation = Annotation.define();

/**
 * Generates selection decorations from remote peers.
 */
export class RemoteSelectionsDecorator implements PluginValue {
  private readonly _ctx = new Context();
  private readonly _cursorConverter: CursorConverter;
  private readonly _provider: AwarenessProvider;
  private readonly _view: EditorView;

  private _lastAnchor?: number;
  private _lastHead?: number;

  public decorations: DecorationSet = RangeSet.of([]);

  constructor(view: EditorView) {
    this._view = view;
    this._cursorConverter = view.state.facet(Cursor.converter);
    this._provider = view.state.facet(awarenessProvider);
    this._provider.open();
    this._provider.remoteStateChange.on(this._ctx, () => {
      view.dispatch({ annotations: [RemoteSelectionChangedAnnotation.of([])] });
    });
  }

  destroy(): void {
    cancelHide(this._view);
    void this._ctx.dispose();
    this._provider.close();
  }

  update(update: ViewUpdate): void {
    this._updateLocalSelection(update.view);
    this._updateRemoteSelections(update.view);
  }

  private _updateLocalSelection(view: EditorView): void {
    const hasFocus = view.hasFocus && view.dom.ownerDocument.hasFocus();
    const { anchor = undefined, head = undefined } = hasFocus ? view.state.selection.main : {};
    if (this._lastAnchor === anchor && this._lastHead === head) {
      return;
    }

    this._lastAnchor = anchor;
    this._lastHead = head;

    this._provider.update(
      anchor !== undefined && head !== undefined
        ? {
            anchor: this._cursorConverter.toCursor(anchor),
            head: this._cursorConverter.toCursor(head, -1),
          }
        : undefined,
    );
  }

  private _updateRemoteSelections(view: EditorView): void {
    const decorations: Range<Decoration>[] = [
      // TODO(burdon): Factor out for testing.
      // {
      //   from: 0,
      //   to: 0,
      //   value: Decoration.widget({ side: 0, block: false, widget: new RemoteCaretWidget('Test', 'red') }),
      // },
    ];

    const hovered = view.state.field(hoveredCaret, false);
    let hoveredRendered = false;
    const awarenessStates = this._provider.getRemoteStates();
    for (const state of awarenessStates) {
      const anchor = state.position?.anchor ? this._cursorConverter.fromCursor(state.position.anchor) : null;
      const head = state.position?.head ? this._cursorConverter.fromCursor(state.position.head) : null;
      if (anchor == null || head == null) {
        continue;
      }

      const start = Math.min(Math.min(anchor, head), view.state.doc.length);
      const end = Math.min(Math.max(anchor, head), view.state.doc.length);

      const startLine = view.state.doc.lineAt(start);
      const endLine = view.state.doc.lineAt(end);

      const darkColor = state.info.darkColor;
      const lightColor = state.info.lightColor;

      if (startLine.number === endLine.number) {
        // Selected content in a single line.
        decorations.push({
          from: start,
          to: end,
          value: Decoration.mark({
            attributes: { style: `background-color: ${lightColor}` },
            class: 'cm-collab-selection',
          }),
        });
      } else {
        // Selected content in multiple lines; first, render text-selection in the first line.
        decorations.push({
          from: start,
          to: startLine.from + startLine.length,
          value: Decoration.mark({
            attributes: { style: `background-color: ${lightColor}` },
            class: 'cm-collab-selection',
          }),
        });

        // Render text-selection in the last line.
        decorations.push({
          from: endLine.from,
          to: end,
          value: Decoration.mark({
            attributes: { style: `background-color: ${lightColor}` },
            class: 'cm-collab-selection',
          }),
        });

        for (let i = startLine.number + 1; i < endLine.number; i++) {
          const linePos = view.state.doc.line(i).from;
          decorations.push({
            from: linePos,
            to: linePos,
            value: Decoration.line({
              attributes: { style: `background-color: ${lightColor}`, class: 'cm-collab-selectionLine' },
            }),
          });
        }
      }

      const name = state.info.displayName ?? 'Anonymous';
      const isHovered = hovered?.pos === head && hovered.name === name;
      hoveredRendered ||= isHovered;
      decorations.push({
        from: head,
        to: head,
        value: Decoration.widget({
          side: head - anchor > 0 ? -1 : 1, // The local cursor should be rendered outside the remote selection.
          block: false,
          widget: new RemoteCaretWidget(name, darkColor, isHovered),
        }),
      });
    }

    // The peer moved or left: its caret element went without a `mouseleave`, so nothing else would hide the name.
    if (hovered && !hoveredRendered) {
      scheduleHide(view);
    }

    this.decorations = Decoration.set(decorations, true);
  }
}

type HoveredCaret = { pos: number; name: string; color: string };

const setHoveredCaret = StateEffect.define<HoveredCaret | null>();

/** How long a caret's name stays up once shown, in ms. */
const MIN_TOOLTIP_DURATION = 1_000;

// Per view, so a pending hide is cancelled when the pointer returns to any caret in the same editor.
const hoveredAt = new WeakMap<EditorView, number>();
const hideTimers = new WeakMap<EditorView, ReturnType<typeof setTimeout>>();

/** Hides the name once it has been up for {@link MIN_TOOLTIP_DURATION}; a hide already pending is kept. */
const scheduleHide = (view: EditorView) => {
  if (hideTimers.has(view)) {
    return;
  }
  const remaining = MIN_TOOLTIP_DURATION - (Date.now() - (hoveredAt.get(view) ?? 0));
  hideTimers.set(
    view,
    setTimeout(
      () => {
        hideTimers.delete(view);
        if (view.dom.isConnected) {
          view.dispatch({ effects: setHoveredCaret.of(null) });
        }
      },
      Math.max(0, remaining),
    ),
  );
};

const cancelHide = (view: EditorView) => {
  clearTimeout(hideTimers.get(view));
  hideTimers.delete(view);
};

/**
 * The name of the remote caret under the pointer, shown as a tooltip: CodeMirror draws tooltips outside the
 * scroller, so the name is not clipped above the first line, and flips below only when the window has no room.
 */
const hoveredCaret = StateField.define<HoveredCaret | null>({
  create: () => null,
  update: (value, tr) => {
    for (const effect of tr.effects) {
      if (effect.is(setHoveredCaret)) {
        return effect.value;
      }
    }
    return value && tr.docChanged ? { ...value, pos: tr.changes.mapPos(value.pos) } : value;
  },
  provide: (field) =>
    showTooltip.from(field, (caret): Tooltip | null =>
      caret
        ? {
            pos: caret.pos,
            above: true,
            create: () => {
              const dom = document.createElement('div');
              dom.className = 'cm-collab-selectionInfo';
              dom.style.backgroundColor = caret.color;
              dom.textContent = caret.name;
              return { dom };
            },
          }
        : null,
    ),
});

class RemoteCaretWidget extends WidgetType {
  constructor(
    private readonly _name: string,
    private readonly _color: string,
    /** Its name tooltip is showing, which outlasts the pointer; the dot hides for as long. */
    private readonly _hovered = false,
  ) {
    super();
  }

  override toDOM(view: EditorView): HTMLElement {
    const span = document.createElement('span');
    span.className = 'cm-collab-selectionCaret';
    span.dataset.name = this._name;
    span.dataset.color = this._color;
    span.toggleAttribute('data-hovered', this._hovered);
    span.style.backgroundColor = this._color;
    span.style.borderColor = this._color;

    const dot = document.createElement('div');
    dot.className = 'cm-collab-selectionCaretDot';

    // The name for assistive tech; sighted readers get it from the hover tooltip.
    const name = document.createElement('span');
    name.className = 'cm-collab-selectionName';
    name.textContent = this._name;

    span.appendChild(document.createTextNode('\u2060'));
    span.appendChild(dot);
    span.appendChild(document.createTextNode('\u2060'));
    span.appendChild(name);
    span.addEventListener('mouseenter', () => {
      cancelHide(view);
      hoveredAt.set(view, Date.now());
      const pos = view.posAtDOM(span);
      view.dispatch({ effects: setHoveredCaret.of({ pos, name: this._name, color: this._color }) });
    });
    // A 2px caret is easy to leave by accident; a name that vanished at once could not be read.
    span.addEventListener('mouseleave', () => scheduleHide(view));
    return span;
  }

  override updateDOM(dom: HTMLElement): boolean {
    // Only the hover state changes in place: replacing the element under the pointer would drop its hover.
    if (dom.dataset.name !== this._name || dom.dataset.color !== this._color) {
      return false;
    }
    dom.toggleAttribute('data-hovered', this._hovered);
    return true;
  }

  override eq(widget: this): boolean {
    return widget._color === this._color && widget._name === this._name && widget._hovered === this._hovered;
  }

  override get estimatedHeight() {
    return -1;
  }

  override ignoreEvent(): boolean {
    return true;
  }
}

const styles = EditorView.theme({
  '.cm-collab-selection': {},
  '.cm-collab-selectionLine': {
    padding: 0,
    margin: '0px 2px 0px 4px',
  },
  '.cm-collab-selectionCaret': {
    position: 'relative',
    borderLeft: '1px solid black',
    borderRight: '1px solid black',
    marginLeft: '-1px',
    marginRight: '-1px',
    boxSizing: 'border-box',
    display: 'inline',
    cursor: 'pointer',
  },
  '.cm-collab-selectionCaretDot': {
    borderRadius: '50%',
    position: 'absolute',
    width: '.5em',
    height: '.5em',
    top: '-.25em',
    left: '-.25em',
    backgroundColor: 'inherit',
    transition: 'transform .3s ease-in-out',
    boxSizing: 'border-box',
  },
  '.cm-collab-selectionCaret[data-hovered] > .cm-collab-selectionCaretDot': {
    transform: 'scale(0)',
    transformOrigin: 'center',
  },
  // Visually hidden, read by assistive tech.
  '.cm-collab-selectionName': {
    position: 'absolute',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    whiteSpace: 'nowrap',
  },
  // Inside a tooltip, which takes the editor's font rather than the line's.
  '.cm-tooltip.cm-collab-selectionInfo': {
    fontSize: '.75em',
    fontFamily: 'sans-serif',
    lineHeight: 'normal',
    userSelect: 'none',
    color: 'white',
    padding: '2px 6px',
    border: 'none',
    borderRadius: '2px',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
  },
  // Square where it meets the caret, so the name reads as the caret's flag.
  '.cm-tooltip-above.cm-collab-selectionInfo': {
    borderBottomLeftRadius: 0,
  },
  '.cm-tooltip-below.cm-collab-selectionInfo': {
    borderTopLeftRadius: 0,
  },
});
