//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, Fragment, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { makeRef } from '@dxos/live-object';
import { log } from '@dxos/log';
import { IconButton, Input, useTranslation, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { OUTLINER_PLUGIN } from '../../meta';
import { getChildNodes, getNext, getPrevious, indent, unindent, type TreeNodeType } from '../../types';
import { type NodeEditorProps, NodeEditor, type NodeEditorController, type NodeEditorEvent } from '../NodeEditor';

type OutlinerController = {
  focus: (id: string | undefined) => void;
};

type OutlinerRootProps = ThemedClassName<{
  root?: TreeNodeType;
  onCreate?: () => TreeNodeType;
  onDelete?: (node: TreeNodeType) => boolean | void;
}>;

const OutlinerRoot = forwardRef<OutlinerController, OutlinerRootProps>(
  ({ classNames, root, onCreate, onDelete }, forwardedRef) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState<string | undefined>();

    const [editor, setEditor] = useState<NodeEditorController | null>(null);
    const [direction, setDirection] = useState<'start' | 'end'>();
    useEffect(() => {
      editor?.focus(direction);
    }, [editor, direction]);

    // External controller.
    useImperativeHandle(
      forwardedRef,
      () => ({
        focus: (id) => {
          log.info('focus', { id });
          setActive(id);
        },
      }),
      [],
    );

    const handleEvent = useCallback<NonNullable<NodeListProps['onEvent']>>(
      (event) => {
        if (!root) {
          return;
        }

        log('handleEvent', { event });
        const { type, parent, node } = event;
        invariant(parent);
        const nodes = getChildNodes(parent);
        const index = nodes.findIndex((n) => n.id === node.id);

        switch (type) {
          //
          // Focus.
          //
          case 'focus': {
            if (event.focusing) {
              setActive(node.id);
            } else {
              setActive(undefined);
            }
            break;
          }

          //
          // Create.
          //
          case 'create': {
            const created = onCreate?.();
            if (created) {
              const idx = nodes.findIndex((n) => n.id === node.id);
              parent.children.splice(idx + 1, 0, makeRef(created));
              setActive(created.id);
            }
            break;
          }

          //
          // Delete.
          // TODO(burdon): Cascade delete or preserve children?
          //
          case 'delete': {
            if (onDelete?.(node) !== false) {
              const previous = getPrevious(root, node);
              const nodes = getChildNodes(parent);
              const idx = nodes.findIndex((n) => n.id === node.id);
              if (idx !== -1) {
                parent.children.splice(idx, 1);
                if (previous) {
                  setTimeout(() => setActive(previous.id));
                }
              }
            }
            break;
          }

          //
          // Indent.
          // TOOD(burdon): Copy/paste/undo.
          // TODO(burdon): Atomic?
          //
          case 'indent': {
            switch (event.direction) {
              case 'previous': {
                if (parent.id !== root.id) {
                  const node = unindent(root, parent, index);
                  if (node) {
                    setActive(node.id);
                  }
                }
                break;
              }

              case 'next': {
                const node = indent(parent, index);
                if (node) {
                  setActive(node.id);
                }
                break;
              }
            }
            break;
          }

          //
          // Move.
          //
          case 'move': {
            switch (event.direction) {
              case 'previous': {
                if (index > 0) {
                  const [node] = nodes.splice(index, 1);
                  parent.children.splice(index, 1); // TODO(burdon): Hack -- see util.tsx
                  parent.children.splice(index - 1, 0, makeRef(node));
                }
                break;
              }

              case 'next': {
                if (index < parent.children.length - 1) {
                  const [node] = nodes.splice(index, 1);
                  parent.children.splice(index, 1); // TODO(burdon): Hack -- see util.tsx
                  parent.children.splice(index + 1, 0, makeRef(node));
                }
                break;
              }
            }
            break;
          }

          //
          // Navigate hierarchy.
          //
          case 'navigate': {
            switch (event.direction) {
              case 'previous': {
                const previous = getPrevious(root, node);
                if (previous && previous !== root) {
                  setActive(previous.id);
                  setDirection('start');
                }
                break;
              }

              case 'next': {
                const next = getNext(root, node, true);
                if (next) {
                  setActive(next.id);
                  setDirection('end');
                }
                break;
              }
            }
            break;
          }
        }
      },
      [root],
    );

    // TODO(burdon): Convert to grid.
    // TODO(burdon): Expand/collapse sub-lists.
    return (
      <div className={mx('flex flex-col grow overflow-hidden', classNames)}>
        <div ref={scrollRef} className='flex flex-col overflow-y-auto scrollbar-thin'>
          {root && (
            <NodeList
              parent={root}
              indent={0}
              editable={true}
              active={active}
              setEditor={setEditor}
              onEvent={handleEvent}
            />
          )}
        </div>
      </div>
    );
  },
);

//
// Row
//

type OutlinerRowProps = ThemedClassName<
  {
    node: TreeNodeType;
    indent: number;
    active?: boolean;
  } & Pick<NodeEditorProps, 'editable' | 'onEvent'>
>;

const OutlinerRow = forwardRef<NodeEditorController, OutlinerRowProps>(
  ({ classNames, node, indent, active, editable, onEvent }, forwardedRef) => {
    const { t } = useTranslation(OUTLINER_PLUGIN);
    return (
      <div className={mx('flex w-full gap-1', classNames)}>
        <div className='flex shrink-0 w-[24px] pt-[8px] justify-center' style={{ marginLeft: indent * 24 }}>
          <Input.Root>
            <Input.Checkbox size={4} />
          </Input.Root>
        </div>

        <NodeEditor ref={forwardedRef} classNames='pbs-1 pbe-1' node={node} editable={editable} onEvent={onEvent} />

        {editable && (
          <div>
            <IconButton
              classNames={mx('opacity-20 hover:opacity-100', active && 'opacity-100')}
              icon='ph--x--regular'
              iconOnly
              variant='ghost'
              label={t('delete object label')}
              onClick={() => onEvent?.({ type: 'delete', node })}
            />
          </div>
        )}
      </div>
    );
  },
);

//
// ChildNodes
//

type NodeListProps = {
  parent: TreeNodeType;
  indent: number;
  active?: string;
  setEditor: (editor: NodeEditorController) => void;
  onEvent: (event: NodeEditorEvent & { parent: TreeNodeType }) => void;
} & Pick<NodeEditorProps, 'editable'>;

const NodeList = ({ parent, indent, setEditor, active, onEvent, ...props }: NodeListProps) => {
  const handleEvent = useCallback<NonNullable<OutlinerRowProps['onEvent']>>(
    (event) => {
      onEvent?.({ ...event, parent });
    },
    [onEvent],
  );

  return getChildNodes(parent).map((node) => (
    <Fragment key={node.id}>
      <OutlinerRow
        ref={node.id === active ? setEditor : null}
        node={node}
        classNames={mx('border-l-4', node.id === active ? 'border-primary-500' : 'border-transparent text-subdued')}
        indent={indent}
        onEvent={handleEvent}
        {...props}
      />
      <NodeList parent={node} indent={indent + 1} active={active} setEditor={setEditor} onEvent={onEvent} {...props} />
    </Fragment>
  ));
};

export const Outliner = {
  Root: OutlinerRoot,
  Editor: NodeEditor,
};

export type { OutlinerRootProps, OutlinerController, NodeEditorProps };
