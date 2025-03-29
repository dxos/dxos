//
// Copyright 2025 DXOS.org
//

import { Prec } from '@codemirror/state';
import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';

import { IconButton, Input, useId, useThemeContext, useTranslation, type ThemedClassName } from '@dxos/react-ui';
import { createThemeExtensions, useTextEditor, createBasicExtensions, keymap, EditorView } from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

import { tagsExtension } from './tags';
import { OUTLINER_PLUGIN } from '../../meta';
import { type TreeNodeType } from '../../types';

export type NodeEditorController = {
  focus: (at?: 'start' | 'end') => void;
};

export type NodeEditorEvent = {
  type: 'focus' | 'navigate' | 'move' | 'indent' | 'create';
  parent?: TreeNodeType;
  node: TreeNodeType;
  direction?: 'previous' | 'next';
  text?: string;
};

export type NodeEditorProps = ThemedClassName<{
  node: TreeNodeType;
  indent: number;
  onEvent?: (event: NodeEditorEvent) => void;
  onDelete?: (node: TreeNodeType) => void;
}>;

/**
 * Individual node editor.
 * Subset of markdown editor.
 */
export const NodeEditor = forwardRef<NodeEditorController, NodeEditorProps>(
  ({ classNames, node, indent, onEvent, onDelete }, ref) => {
    const { t } = useTranslation(OUTLINER_PLUGIN);
    const [focused, setFocused] = useState<boolean>(false);
    const { themeMode } = useThemeContext();
    const id = useId('node_enditor', node.id);

    // NOTE: Must not change callbacks.
    const { parentRef, view } = useTextEditor(
      () => ({
        initialValue: node.text,
        extensions: [
          // TODO(burdon): Markdown subset.
          // TODO(burdon): Show placeholder only if focused.
          createBasicExtensions({ placeholder: 'Enter text...' }),
          createThemeExtensions({ themeMode }),

          // Tags.
          tagsExtension(),

          // Monitor focus.
          EditorView.focusChangeEffect.of((_state, focusing) => {
            setFocused(focusing);
            if (focusing) {
              onEvent?.({ type: 'focus', node });
            }

            return null;
          }),

          // Key bindings.
          Prec.highest(
            keymap.of([
              {
                key: 'Shift-Enter',
                run: (view) => {
                  view.dispatch(view.state.replaceSelection('\n'));
                  return true;
                },
              },
              {
                key: 'Enter',
                run: () => {
                  onEvent?.({ type: 'create', node });
                  return true;
                },
              },
              {
                key: 'Backspace',
                run: (view) => {
                  if (!onDelete || view.state.doc.length) {
                    return false;
                  } else {
                    onDelete(node);
                    return true;
                  }
                },
              },

              //
              // Indent.
              //
              {
                key: 'Shift-Tab',
                run: (view) => {
                  onEvent?.({ type: 'indent', node, direction: 'previous' });
                  return true;
                },
              },
              {
                key: 'Tab',
                run: (view) => {
                  onEvent?.({ type: 'indent', node, direction: 'next' });
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
      }),
      [node],
    );

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

    return (
      <div id={id} className={mx('flex w-full gap-1', classNames)} ref={div}>
        <div className='flex shrink-0 w-[24px] pt-[8px] justify-center' style={{ marginLeft: indent * 24 }}>
          <Input.Root>
            <Input.Checkbox size={4} title={node.id} />
          </Input.Root>
        </div>

        <div ref={parentRef} className='  w-full pbs-1' />

        {onDelete && (
          <div>
            <IconButton
              classNames={mx('opacity-20 hover:opacity-100', focused && 'opacity-100')}
              icon='ph--x--regular'
              iconOnly
              variant='ghost'
              label={t('delete button')}
              onClick={() => onDelete(node)}
            />
          </div>
        )}
      </div>
    );
  },
);
