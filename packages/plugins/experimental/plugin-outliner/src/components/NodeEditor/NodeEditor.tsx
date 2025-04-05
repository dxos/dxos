//
// Copyright 2025 DXOS.org
//

import { Prec } from '@codemirror/state';
import React, { forwardRef, StrictMode, useImperativeHandle } from 'react';
import { createRoot } from 'react-dom/client';

import { createDocAccessor } from '@dxos/react-client/echo';
import { Icon, ThemeProvider, useThemeContext, type ThemedClassName } from '@dxos/react-ui';
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

export type NodeEditorController = {
  focus: (at?: 'start' | 'end' | number) => void;
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
  | {
      type: 'navigate';
      node: TreeNodeType;
      direction: 'previous' | 'next';
      at: 'start' | 'end' | number;
    }
  | {
      type: 'indent';
      node: TreeNodeType;
      direction: 'previous' | 'next';
    };

export type NodeEditorProps = ThemedClassName<{
  node: TreeNodeType;
  editable?: boolean;
  placeholder?: string;
  onEvent?: (event: NodeEditorEvent) => void;
}>;

/**
 * Individual node editor.
 * Subset of markdown editor.
 */
export const NodeEditor = forwardRef<NodeEditorController, NodeEditorProps>(
  ({ classNames, node, editable, placeholder, onEvent }, ref) => {
    const { themeMode } = useThemeContext();

    // NOTE: Must not change callbacks.
    const { parentRef, view } = useTextEditor(() => {
      return {
        initialValue: node.data.text,
        extensions: [
          // NOTE: Path is relative to tree (ECHO object).
          automerge(createDocAccessor(node, ['data', 'text'])),

          createBasicExtensions({ readonly: !editable, editable: false, placeholder }),
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
              setTimeout(() => onEvent?.({ type: 'focus', node, focusing }));
            } else {
              onEvent?.({ type: 'focus', node, focusing });
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
                  const { from } = view.state.selection.ranges[0];
                  if (from > 0) {
                    return false;
                  } else {
                    onEvent?.({ type: 'navigate', node, direction: 'previous', at: 'end' });
                    return true;
                  }
                },
              },
              {
                key: 'ArrowRight',
                run: (view) => {
                  const { from } = view.state.selection.ranges[0];
                  if (from < view.state.doc.length) {
                    return false;
                  } else {
                    onEvent?.({ type: 'navigate', node, direction: 'next', at: 'start' });
                    return true;
                  }
                },
              },
              {
                key: 'ArrowUp',
                run: (view) => {
                  const { from } = view.state.selection.ranges[0];
                  onEvent?.({ type: 'navigate', node, direction: 'previous', at: from });
                  return true;
                },
              },
              {
                key: 'ArrowDown',
                run: (view) => {
                  const { from } = view.state.selection.ranges[0];
                  onEvent?.({ type: 'navigate', node, direction: 'next', at: from });
                  return true;
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
    }, [node, editable]);

    // Controller.
    useImperativeHandle(
      ref,
      () => {
        return {
          focus: (at) => {
            if (view) {
              parentRef.current?.scrollIntoView({ behavior: 'instant', block: 'nearest' });
              if (!view.hasFocus) {
                view.focus();
                view.dispatch({
                  selection: {
                    anchor:
                      typeof at === 'number'
                        ? Math.min(Math.max(at, 0), view.state.doc.length)
                        : at === 'start'
                          ? 0
                          : view.state.doc.length,
                  },
                });
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
