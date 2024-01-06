//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import * as cmState from '@codemirror/state';
import * as cmView from '@codemirror/view';
import * as dom from 'lib0/dom';
import * as pair from 'lib0/pair';

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';

import { CursorConverter } from './cursor-converter';

export const awareness = (provider = EMPTY_AWARENESS_PROVIDER): Extension => {
  return [
    yRemoteSelectionsTheme,
    AwarenessProvider.of(provider),
    cmView.ViewPlugin.fromClass(RemoteSelectionsPluginValue, {
      decorations: (v) => v.decorations,
    }),
  ];
};

const yRemoteSelectionsTheme = cmView.EditorView.baseTheme({
  '.cm-ySelection': {},
  '.cm-yLineSelection': {
    padding: 0,
    margin: '0px 2px 0px 4px',
  },
  '.cm-ySelectionCaret': {
    position: 'relative',
    borderLeft: '1px solid black',
    borderRight: '1px solid black',
    marginLeft: '-1px',
    marginRight: '-1px',
    boxSizing: 'border-box',
    display: 'inline',
  },
  '.cm-ySelectionCaretDot': {
    borderRadius: '50%',
    position: 'absolute',
    width: '.4em',
    height: '.4em',
    top: '-.2em',
    left: '-.2em',
    backgroundColor: 'inherit',
    transition: 'transform .3s ease-in-out',
    boxSizing: 'border-box',
  },
  '.cm-ySelectionCaret:hover > .cm-ySelectionCaretDot': {
    transformOrigin: 'bottom center',
    transform: 'scale(0)',
  },
  '.cm-ySelectionInfo': {
    position: 'absolute',
    top: '-1.05em',
    left: '-1px',
    fontSize: '.75em',
    fontFamily: 'serif',
    fontStyle: 'normal',
    fontWeight: 'normal',
    lineHeight: 'normal',
    userSelect: 'none',
    color: 'white',
    paddingLeft: '2px',
    paddingRight: '2px',
    zIndex: 101,
    transition: 'opacity .3s ease-in-out',
    backgroundColor: 'inherit',
    // these should be separate
    opacity: 0,
    transitionDelay: '0s',
    whiteSpace: 'nowrap',
  },
  '.cm-ySelectionCaret:hover > .cm-ySelectionInfo': {
    opacity: 1,
    transitionDelay: '0s',
  },
});

/**
 * @todo specify the users that actually changed. Currently, we recalculate positions for every user.
 * @type {cmState.AnnotationType<Array<number>>}
 */
const RemoteSelectionChangedAnnotation = cmState.Annotation.define();

export type AwarenessPosition = {
  /**
   * Cursor.
   */
  anchor?: string;

  /**
   * Cursor.
   */
  head?: string;
};

export type AwarenessInfo = {
  displayName?: string;
  color?: string;
  lightColor?: string;
}

export type AwarenessState = {
  position?: AwarenessPosition;
  peerId: string;
  info: AwarenessInfo
};

export interface AwarenessProvider {
  open(): void;
  close(): void;
  localPositionChanged(position: AwarenessPosition | undefined): void;
  remoteStateChange: Event<void>;
  getRemoteStates(): AwarenessState[];
}

const EMPTY_AWARENESS_PROVIDER: AwarenessProvider = {
  open() { },
  close() { },
  localPositionChanged (state) {},
  remoteStateChange: new Event(),
  getRemoteStates: () => [],
};

export const AwarenessProvider = cmState.Facet.define<AwarenessProvider, AwarenessProvider>({
  combine: (providers) => providers[0] ?? EMPTY_AWARENESS_PROVIDER,
});

class RemoteCaretWidget extends cmView.WidgetType {
  constructor(public color: string, public name: string) {
    super();
    this.color = color;
    this.name = name;
  }

  toDOM(): HTMLElement {
    return dom.element(
      'span',
      [
        pair.create('class', 'cm-ySelectionCaret'),
        pair.create('style', `background-color: ${this.color}; border-color: ${this.color}`),
      ],
      [
        dom.text('\u2060'),
        dom.element('div', [pair.create('class', 'cm-ySelectionCaretDot')]),
        dom.text('\u2060'),
        dom.element('div', [pair.create('class', 'cm-ySelectionInfo')], [dom.text(this.name)]),
        dom.text('\u2060'),
      ],
    ) as HTMLElement;
  }

  override eq(widget: this) {
    return widget.color === this.color;
  }

  compare(widget: this) {
    return widget.color === this.color;
  }

  override updateDOM() {
    return false;
  }

  override get estimatedHeight() {
    return -1;
  }

  override ignoreEvent() {
    return true;
  }
}

export class RemoteSelectionsPluginValue {
  private readonly _ctx = new Context();
  private _provider: AwarenessProvider;
  private _cursorConverter: CursorConverter;

  public decorations: cmView.DecorationSet = cmState.RangeSet.of([]);
  private _hasLoadedAwarenessState = false;

  private _lastAnchor?: number = undefined;
  private _lastHead?: number = undefined;

  constructor(view: cmView.EditorView) {
    this._provider = view.state.facet(AwarenessProvider);
    this._provider.open();
    this._provider.remoteStateChange.on(this._ctx, () => {
      view.dispatch({ annotations: [RemoteSelectionChangedAnnotation.of([])] });
    });
    this._cursorConverter = view.state.facet(CursorConverter);
  }

  destroy() {
    this._ctx.dispose();
    this._provider.close();
  }

  private _updateLocalSelection(update: cmView.ViewUpdate) {
    const hasFocus = update.view.hasFocus && update.view.dom.ownerDocument.hasFocus();
    const sel = hasFocus ? update.state.selection.main : undefined;

    if(this._lastHead === sel?.head && this._lastAnchor === sel?.anchor) {
      return;
    }

    this._lastHead = sel?.head;
    this._lastAnchor = sel?.anchor;

    const selCursor = sel
      ? {
          anchor: this._cursorConverter.toCursor(sel.anchor),
          head: this._cursorConverter.toCursor(sel.head),
        }
      : undefined;

    this._provider.localPositionChanged(selCursor);
  }

  private _updateRemoteSelections(update: cmView.ViewUpdate) {
    this._hasLoadedAwarenessState = true;

    const decorations: Array<cmState.Range<cmView.Decoration>> = [];
    const awarenessStates = this._provider.getRemoteStates();

    for (const state of awarenessStates) {
      const anchor = state.position?.anchor ? this._cursorConverter.fromCursor(state.position.anchor) : null;
      const head = state.position?.head ? this._cursorConverter.fromCursor(state.position.head) : null;

      if (anchor == null || head == null) {
        continue;
      }

      const start = Math.min(Math.min(anchor, head), update.view.state.doc.length);
      const end = Math.min(Math.max(anchor, head), update.view.state.doc.length);

      const startLine = update.view.state.doc.lineAt(start);
      const endLine = update.view.state.doc.lineAt(end);

      const color = state.info.color ?? '#30bced';
      const lightColor = state.info.lightColor ?? (color + '33');

      if (startLine.number === endLine.number) {
        // selected content in a single line.
        decorations.push({
          from: start,
          to: end,
          value: cmView.Decoration.mark({
            attributes: { style: `background-color: ${lightColor}` },
            class: 'cm-ySelection',
          }),
        });
      } else {
        // selected content in multiple lines
        // first, render text-selection in the first line
        decorations.push({
          from: start,
          to: startLine.from + startLine.length,
          value: cmView.Decoration.mark({
            attributes: { style: `background-color: ${color}` },
            class: 'cm-ySelection',
          }),
        });
        // render text-selection in the last line
        decorations.push({
          from: endLine.from,
          to: end,
          value: cmView.Decoration.mark({
            attributes: { style: `background-color: ${color}` },
            class: 'cm-ySelection',
          }),
        });
        for (let i = startLine.number + 1; i < endLine.number; i++) {
          const linePos = update.view.state.doc.line(i).from;
          decorations.push({
            from: linePos,
            to: linePos,
            value: cmView.Decoration.line({
              attributes: { style: `background-color: ${color}`, class: 'cm-yLineSelection' },
            }),
          });
        }
      }
      decorations.push({
        from: head,
        to: head,
        value: cmView.Decoration.widget({
          side: head - anchor > 0 ? -1 : 1, // the local cursor should be rendered outside the remote selection
          block: false,
          widget: new RemoteCaretWidget(color, state.info.displayName ?? 'Anonymous'),
        }),
      });
    }

    this.decorations = cmView.Decoration.set(decorations, true);
  }

  update(update: cmView.ViewUpdate) {
    this._updateLocalSelection(update);
    this._updateRemoteSelections(update);
  }
}
