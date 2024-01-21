//
// Copyright 2024 DXOS.org
//

import { Annotation, Facet, type Extension, RangeSet, type Range } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  type PluginValue,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view';
import { useEffect } from 'react';

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { generateName } from '@dxos/display-name';
import { useThemeContext } from '@dxos/react-ui';
import { getColorForValue } from '@dxos/react-ui-theme';

import { Cursor, type CursorConverter } from './cursor';
import { type EditorModel } from '../hooks';

export interface AwarenessProvider {
  remoteStateChange: Event<void>;

  open(): void;
  close(): void;

  update(position: AwarenessPosition | undefined): void;
  getRemoteStates(): AwarenessState[];
}

const dummyProvider: AwarenessProvider = {
  remoteStateChange: new Event(),

  open: () => {},
  close: () => {},

  update: () => {},
  getRemoteStates: () => [],
};

export const AwarenessProvider = Facet.define<AwarenessProvider, AwarenessProvider>({
  combine: (providers) => providers[0] ?? dummyProvider,
});

// TODO(dmaretskyi): Specify the users that actually changed. Currently, we recalculate positions for every user.
const RemoteSelectionChangedAnnotation = Annotation.define();

export type AwarenessPosition = {
  anchor?: string;
  head?: string;
};

export type AwarenessInfo = {
  displayName?: string;
  // TODO(burdon): Rename light/dark.
  color?: string;
  lightColor?: string;
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
    AwarenessProvider.of(provider),
    ViewPlugin.fromClass(RemoteSelectionsDecorator, {
      decorations: (value) => value.decorations,
    }),
    styles,
  ];
};

export const useAwareness = ({ awareness, peer }: EditorModel) => {
  const { themeMode } = useThemeContext();
  useEffect(() => {
    if (awareness && peer) {
      awareness.setLocalStateField('user', {
        name: peer.name ?? generateName(peer.id),
        color: getColorForValue({ value: peer.id, type: 'color' }),
        colorLight: getColorForValue({ value: peer.id, themeMode, type: 'highlight' }),
      });
    }
  }, [awareness, peer, themeMode]);
};

/**
 * Generates selection decorations from remote peers.
 */
export class RemoteSelectionsDecorator implements PluginValue {
  public decorations: DecorationSet = RangeSet.of([]);

  private readonly _ctx = new Context();

  private _cursorConverter: CursorConverter;
  private _provider: AwarenessProvider;
  private _lastAnchor?: number = undefined;
  private _lastHead?: number = undefined;

  constructor(view: EditorView) {
    this._cursorConverter = view.state.facet(Cursor.converter);
    this._provider = view.state.facet(AwarenessProvider);
    this._provider.open();
    this._provider.remoteStateChange.on(this._ctx, () => {
      view.dispatch({ annotations: [RemoteSelectionChangedAnnotation.of([])] });
    });
  }

  destroy() {
    void this._ctx.dispose();
    this._provider.close();
  }

  update(update: ViewUpdate) {
    this._updateLocalSelection(update);
    this._updateRemoteSelections(update);
  }

  private _updateLocalSelection(update: ViewUpdate) {
    const hasFocus = update.view.hasFocus && update.view.dom.ownerDocument.hasFocus();
    const { anchor = undefined, head = undefined } = hasFocus ? update.state.selection.main : {};
    if (this._lastAnchor === anchor && this._lastHead === head) {
      return;
    }

    this._lastAnchor = anchor;
    this._lastHead = head;

    this._provider.update(
      anchor !== undefined && head !== undefined
        ? {
            anchor: this._cursorConverter.toCursor(anchor),
            head: this._cursorConverter.toCursor(head),
          }
        : undefined,
    );
  }

  private _updateRemoteSelections(update: ViewUpdate) {
    const decorations: Range<Decoration>[] = [];
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

      // TODO(burdon): Factor out styles.
      const color = state.info.color ?? '#30bced';
      const lightColor = state.info.lightColor ?? color + '33';

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
            attributes: { style: `background-color: ${color}` },
            class: 'cm-collab-selection',
          }),
        });

        // Render text-selection in the last line.
        decorations.push({
          from: endLine.from,
          to: end,
          value: Decoration.mark({
            attributes: { style: `background-color: ${color}` },
            class: 'cm-collab-selection',
          }),
        });

        for (let i = startLine.number + 1; i < endLine.number; i++) {
          const linePos = update.view.state.doc.line(i).from;
          decorations.push({
            from: linePos,
            to: linePos,
            value: Decoration.line({
              attributes: { style: `background-color: ${color}`, class: 'cm-collab-selectionLine' },
            }),
          });
        }
      }

      decorations.push({
        from: head,
        to: head,
        value: Decoration.widget({
          side: head - anchor > 0 ? -1 : 1, // The local cursor should be rendered outside the remote selection.
          block: false,
          widget: new RemoteCaretWidget(state.info.displayName ?? 'Anonymous', color),
        }),
      });
    }

    this.decorations = Decoration.set(decorations, true);
  }
}

class RemoteCaretWidget extends WidgetType {
  constructor(private readonly _name: string, private readonly _color: string) {
    super();
  }

  override toDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = 'cm-collab-selectionCaret';
    span.style.backgroundColor = this._color;
    span.style.borderColor = this._color;

    const dot = document.createElement('div');
    dot.className = 'cm-collab-selectionCaretDot';

    const info = document.createElement('div');
    info.className = 'cm-collab-selectionInfo';
    info.innerText = this._name;

    span.appendChild(document.createTextNode('\u2060'));
    span.appendChild(dot);
    span.appendChild(document.createTextNode('\u2060'));
    span.appendChild(info);
    span.appendChild(document.createTextNode('\u2060'));

    return span;
  }

  override updateDOM() {
    return false;
  }

  override eq(widget: this) {
    return widget._color === this._color;
  }

  override get estimatedHeight() {
    return -1;
  }

  override ignoreEvent() {
    return true;
  }
}

// TODO(burdon): Mixed case?
const styles = EditorView.baseTheme({
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
  },
  '.cm-collab-selectionCaretDot': {
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
  '.cm-collab-selectionCaret:hover > .cm-collab-selectionCaretDot': {
    transformOrigin: 'bottom center',
    transform: 'scale(0)',
  },
  '.cm-collab-selectionInfo': {
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
    // These should be separate.
    opacity: 0,
    transitionDelay: '0s',
    whiteSpace: 'nowrap',
  },
  '.cm-collab-selectionCaret:hover > .cm-collab-selectionInfo': {
    opacity: 1,
    transitionDelay: '0s',
  },
});
