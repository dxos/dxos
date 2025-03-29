//
// Copyright 2025 DXOS.org
//

import { Prec } from '@codemirror/state';
import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';

import { IconButton, Input, useId, useThemeContext, useTranslation, type ThemedClassName } from '@dxos/react-ui';
import { createThemeExtensions, useTextEditor, createBasicExtensions, keymap, EditorView } from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

import { OUTLINER_PLUGIN } from '../../meta';
import { type TreeNodeType } from '../../types';

export type NodeEditorController = {
  focus: (at?: 'start' | 'end') => void;
};

export type NodeEditorEvent = {
  parent?: TreeNodeType;
  node: TreeNodeType;
  direction: 'previous' | 'next';
};

export type NodeEditorProps = ThemedClassName<{
  node: TreeNodeType;
  onFocus?: (node: TreeNodeType) => void;
  onNavigate?: (event: NodeEditorEvent) => void;
  onCreate?: (node: TreeNodeType, text?: string) => void;
  onDelete?: (node: TreeNodeType) => void;
}>;

/**
 * Individual node editor.
 * Subset of markdown editor.
 */
export const NodeEditor = forwardRef<NodeEditorController, NodeEditorProps>(
  ({ classNames, node, onFocus, onNavigate, onCreate, onDelete }, ref) => {
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

          // Monitor focus.
          EditorView.focusChangeEffect.of((_state, focusing) => {
            setFocused(focusing);
            if (focusing) {
              onFocus?.(node);
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
                  onCreate?.(node);
                  return true;
                },
              },
              {
                key: 'Backspace',
                run: (view) => {
                  if (view.state.doc.length) {
                    return false;
                  } else {
                    onDelete?.(node);
                    return true;
                  }
                },
              },

              //
              // Indent.
              //
              {
                key: 'Tab',
                run: (view) => {
                  return true;
                },
              },
              {
                key: 'Shift-Tab',
                run: (view) => {
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
                    onNavigate?.({ node, direction: 'previous' });
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
                    onNavigate?.({ node, direction: 'next' });
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
                    onNavigate?.({ node, direction: 'previous' });
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
                    onNavigate?.({ node, direction: 'next' });
                    return true;
                  }
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
        <div className='px-2 pt-[3px]'>
          <Input.Root>
            <Input.Checkbox size={4} title={node.id} />
          </Input.Root>
        </div>

        <div ref={parentRef} className='w-full pbs-1' />

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
