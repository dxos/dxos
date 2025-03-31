//
// Copyright 2025 DXOS.org
//

import { Prec } from '@codemirror/state';
import React, { forwardRef, StrictMode, useImperativeHandle, useRef } from 'react';
import { createRoot } from 'react-dom/client';

import { createDocAccessor } from '@dxos/react-client/echo';
import { Icon, useThemeContext, type ThemedClassName } from '@dxos/react-ui';
import {
  EditorView,
  automerge,
  createBasicExtensions,
  createThemeExtensions,
  decorateMarkdown,
  keymap,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

import { tagsExtension } from './tags';
import { type TreeNodeType } from '../../types';

export type NodeEditorController = {
  focus: (at?: 'start' | 'end') => void;
};

export type NodeEditorEvent =
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
      direction?: 'previous' | 'next';
    }
  | {
      type: 'indent';
      node: TreeNodeType;
      direction?: 'previous' | 'next';
    };

export type NodeEditorProps = ThemedClassName<{
  node: TreeNodeType;
  editable?: boolean;
  onEvent?: (event: NodeEditorEvent) => void;
}>;

/**
 * Individual node editor.
 * Subset of markdown editor.
 */
export const NodeEditor = forwardRef<NodeEditorController, NodeEditorProps>(
  ({ classNames, node, editable, onEvent }, ref) => {
    const { themeMode } = useThemeContext();

    // NOTE: Must not change callbacks.
    const { parentRef, view } = useTextEditor(() => {
      return {
        initialValue: node.text,
        extensions: [
          automerge(createDocAccessor(node, ['text'])),

          // TODO(burdon): Show placeholder only if focused.
          createBasicExtensions({ readonly: !editable, editable: false, placeholder: 'Enter text...' }),
          createThemeExtensions({ themeMode }),

          // TODO(burdon): Markdown subset.
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
                    onEvent?.({ type: 'navigate', node, direction: 'previous' });
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
                    onEvent?.({ type: 'navigate', node, direction: 'next' });
                    return true;
                  }
                },
              },
              {
                key: 'ArrowUp',
                run: (view) => {
                  const { from } = view.state.selection.ranges[0];
                  if (from > 0) {
                    return false;
                  } else {
                    onEvent?.({ type: 'navigate', node, direction: 'previous' });
                    return true;
                  }
                },
              },
              {
                key: 'ArrowDown',
                run: (view) => {
                  const { from } = view.state.selection.ranges[0];
                  if (from < view.state.doc.length) {
                    return false;
                  } else {
                    onEvent?.({ type: 'navigate', node, direction: 'next' });
                    return true;
                  }
                },
              },

              //
              // Move.
              //
              {
                key: 'cmd-ArrowUp',
                run: (view) => {
                  onEvent?.({ type: 'move', node, direction: 'previous' });
                  return true;
                },
              },
              {
                key: 'cmd-ArrowDown',
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
    const div = useRef<HTMLDivElement>(null);
    useImperativeHandle(
      ref,
      () => {
        return {
          focus: (at) => {
            if (view) {
              div.current?.scrollIntoView({ behavior: 'instant', block: 'nearest' });
              view.focus();
              view.dispatch({
                selection: {
                  anchor: at === 'start' ? 0 : view.state.doc.length,
                },
              });
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
      <a href={url} rel='noreferrer' target='_blank' className={hover}>
        <Icon
          icon='ph--arrow-square-out--regular'
          classNames='inline-block leading-none mis-1 cursor-pointer'
          size={4}
        />
      </a>
    </StrictMode>,
  );
};
