//
// Copyright 2025 DXOS.org
//

import { EditorSelection, Prec, type SelectionRange } from '@codemirror/state';
import React, { forwardRef, StrictMode, useImperativeHandle } from 'react';
import { createRoot } from 'react-dom/client';

import { getLabel } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { createDocAccessor, getSchema } from '@dxos/react-client/echo';
import { Icon, ThemeProvider, useDynamicRef, useThemeContext, type ThemedClassName } from '@dxos/react-ui';
import {
  EditorView,
  automerge,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  keymap,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { defaultTx, mx } from '@dxos/react-ui-theme';

import { tagsExtension } from './tags';
import { type TreeNodeType } from '../../types';

export type CursorPosition = {
  line?: 'first' | 'last';
  goalColumn?: number;
};

export type NodeEditorController = {
  focus: (cursor?: CursorPosition) => void;
};

export type NodeEditorEvent =
  // TODO(burdon): Allows plugins to extend actions.
  | {
      type: 'action';
      node: TreeNodeType;
      action: string;
    }
  | {
      type: 'focus';
      node: TreeNodeType;
      focusing: boolean;
    }
  | {
      type: 'create';
      node: TreeNodeType;
    }
  | {
      type: 'delete';
      node: TreeNodeType;
    }
  | {
      type: 'move';
      node: TreeNodeType;
      direction?: 'previous' | 'next';
    }
  | ({
      type: 'navigate';
      node: TreeNodeType;
      direction: 'previous' | 'next';
    } & CursorPosition)
  | {
      type: 'indent';
      node: TreeNodeType;
      direction: 'previous' | 'next';
    };

export type NodeEditorProps = ThemedClassName<{
  node: TreeNodeType;
  readOnly?: boolean;
  placeholder?: string;
  onEvent?: (event: NodeEditorEvent) => void;
}>;

/**
 * Individual node editor.
 * Subset of markdown editor.
 */
export const NodeEditor = forwardRef<NodeEditorController, NodeEditorProps>(
  ({ classNames, node, readOnly, placeholder, onEvent }, ref) => {
    const { themeMode } = useThemeContext();

    // TODO(burdon): Factor out.
    let initialValue = node.data.text;
    if (node.ref?.target) {
      const schema = getSchema(node.ref.target);
      if (schema) {
        initialValue = getLabel(schema, node.ref.target);
      }
    }

    // NOTE: Must not change callbacks.
    const handleEvent = useDynamicRef<NodeEditorProps['onEvent']>(onEvent);

    const { parentRef, view } = useTextEditor(() => {
      return {
        initialValue,
        extensions: [
          // NOTE: Path is relative to tree (ECHO object).
          readOnly ? [] : automerge(createDocAccessor(node, ['data', 'text'])),

          createBasicExtensions({ readOnly, placeholder }),
          createThemeExtensions({ themeMode }),

          // Markdown subset.
          createMarkdownExtensions({ themeMode }),
          decorateMarkdown({ renderLinkButton: onRenderLink }),

          // Tags.
          tagsExtension(),

          // Monitor focus.
          EditorView.focusChangeEffect.of((_state, focusing) => {
            if (focusing) {
              // Ensure focus events happen after unfocusing.
              setTimeout(() => handleEvent.current?.({ type: 'focus', node, focusing }));
            } else {
              handleEvent.current?.({ type: 'focus', node, focusing });
            }
            return null;
          }),

          // Key bindings.
          Prec.highest(
            keymap.of([
              {
                key: 'Enter',
                run: () => {
                  onEvent?.({ type: 'create', node });
                  return true;
                },
                shift: (view) => {
                  view.dispatch(view.state.replaceSelection('\n'));
                  return true;
                },
              },
              {
                key: 'Escape',
                run: (view) => {
                  view.contentDOM.blur();
                  return true;
                },
              },
              {
                key: 'Backspace',
                run: (view) => {
                  if (!onEvent || view.state.doc.length) {
                    return false;
                  } else {
                    onEvent?.({ type: 'delete', node });
                    return true;
                  }
                },
              },

              //
              // Indent.
              //
              {
                key: 'Tab',
                preventDefault: true,
                run: (view) => {
                  onEvent?.({ type: 'indent', node, direction: 'next' });
                  return true;
                },
                shift: (view) => {
                  onEvent?.({ type: 'indent', node, direction: 'previous' });
                  return true;
                },
              },

              //
              // Navigate.
              //
              {
                key: 'ArrowLeft',
                run: (view) => {
                  if (view.state.selection.main.from > 0) {
                    return false;
                  } else {
                    onEvent?.({ type: 'navigate', node, direction: 'previous', line: 'last' });
                    return true;
                  }
                },
              },
              {
                key: 'ArrowRight',
                run: (view) => {
                  if (view.state.selection.main.from < view.state.doc.length) {
                    return false;
                  } else {
                    onEvent?.({ type: 'navigate', node, direction: 'next', line: 'first' });
                    return true;
                  }
                },
              },
              {
                key: 'ArrowUp',
                run: (view) => {
                  if (!isFirstLine(view, view.state.selection.main)) {
                    return false;
                  } else {
                    const goalColumn = getColumn(view, view.state.selection.main);
                    onEvent?.({ type: 'navigate', node, direction: 'previous', line: 'last', goalColumn });
                    return true;
                  }
                },
              },
              {
                key: 'ArrowDown',
                run: (view) => {
                  if (!isLastLine(view, view.state.selection.main)) {
                    return false;
                  } else {
                    const goalColumn = getColumn(view, view.state.selection.main);
                    onEvent?.({ type: 'navigate', node, direction: 'next', line: 'first', goalColumn });
                    return true;
                  }
                },
              },

              //
              // Move.
              //
              {
                key: 'alt-ArrowUp',
                run: (view) => {
                  onEvent?.({ type: 'move', node, direction: 'previous' });
                  return true;
                },
              },
              {
                key: 'alt-ArrowDown',
                run: (view) => {
                  onEvent?.({ type: 'move', node, direction: 'next' });
                  return true;
                },
              },
            ]),
          ),
        ],
      };
    }, [node, readOnly]);

    // Controller.
    useImperativeHandle(
      ref,
      () => {
        return {
          focus: ({ line = 'last', goalColumn } = {}) => {
            if (view) {
              parentRef.current?.scrollIntoView({ behavior: 'instant', block: 'nearest' });
              if (!view.hasFocus) {
                let anchor = 0;
                switch (line) {
                  case 'first':
                    anchor = Math.min(view.state.doc.length, goalColumn ?? 0);
                    break;
                  case 'last':
                    anchor = Math.min(
                      view.state.doc.length,
                      getPosition(
                        view,
                        EditorSelection.range(view.state.doc.length, view.state.doc.length),
                        goalColumn ?? -1,
                      ),
                    );
                    break;
                }

                view.focus();
                view.dispatch({ selection: { anchor } });
              }
            }
          },
        };
      },
      [view],
    );

    return <div ref={parentRef} className={mx('w-full', classNames)} />;
  },
);

const isFirstLine = (view: EditorView, selection: SelectionRange): boolean => {
  const cursorCoords = view.coordsAtPos(selection.from);
  invariant(cursorCoords);
  const editorRect = view.scrollDOM.getBoundingClientRect();
  return cursorCoords.top - view.defaultLineHeight < editorRect.top;
};

const isLastLine = (view: EditorView, selection: SelectionRange): boolean => {
  const cursorCoords = view.coordsAtPos(selection.from);
  invariant(cursorCoords);
  const editorRect = view.scrollDOM.getBoundingClientRect();
  return cursorCoords.bottom + view.defaultLineHeight > editorRect.bottom;
};

/**
 * Return the current column (allowing for line wrapping).
 */
const getColumn = (view: EditorView, selection: SelectionRange): number => {
  const { from } = view.moveToLineBoundary(selection, false, true);
  return selection.head - from;
};

/**
 * Return the position at the goal column on the current line (allowing for line wrapping).
 * If goalColumn is -1, return the position at the end of the line.
 */
const getPosition = (view: EditorView, selection: SelectionRange, goalColumn: number): number => {
  const { from } = view.moveToLineBoundary(selection, goalColumn === -1, true);
  if (goalColumn === -1) {
    return from;
  } else {
    return Math.min(from + goalColumn, view.state.doc.length);
  }
};

// TODO(burdon): Factor out style.
const hover = 'rounded-sm text-primary-600 hover:text-primary-500 dark:text-primary-300 hover:dark:text-primary-200';

const onRenderLink = (el: Element, url: string) => {
  createRoot(el).render(
    <StrictMode>
      <ThemeProvider tx={defaultTx}>
        <a href={url} rel='noreferrer' target='_blank' className={hover}>
          <Icon
            icon='ph--arrow-square-out--regular'
            classNames='inline-block leading-none mis-1 cursor-pointer'
            size={4}
          />
        </a>
      </ThemeProvider>
    </StrictMode>,
  );
};
