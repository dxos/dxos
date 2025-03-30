//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, Fragment, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { makeRef } from '@dxos/live-object';
import { log } from '@dxos/log';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { getChildNodes, getNext, getParent, getPrevious, type TreeNodeType } from '../../types';
import { type NodeEditorProps, NodeEditor, type NodeEditorController, type NodeEditorEvent } from '../NodeEditor';

type OutlinerController = {
  focus: (id: string | undefined) => void;
};

type OutlinerRootProps = ThemedClassName<{
  root: TreeNodeType;
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

    const handleEvent = useCallback<NonNullable<ChildNodesProps['onEvent']>>(
      (event) => {
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
          // Indent.
          // TOOD(burdon): Copy/paste/undo.
          // TODO(burdon): Tests.
          //
          case 'indent': {
            switch (event.direction) {
              case 'previous': {
                if (parent.id !== root.id) {
                  const ancestor = getParent(root, parent);
                  if (ancestor) {
                    // Transplant following siblings to current node.
                    // const [ref, ...rest] = nodes.splice(index, parent.children.length - index);
                    // const idx = getChildNodes(ancestor).findIndex((n) => n.id === parent.id);
                    // ancestor.children.splice(idx + 1, 0, makeRef(ref));
                    // ref.children.push(...rest.map(makeRef));
                    // Add to ancestor.
                    const idx = getChildNodes(ancestor).findIndex((n) => n.id === parent.id);
                    ancestor.children.splice(idx + 1, 0, makeRef(node));
                    // Transplant following siblings to current node.
                    const rest = nodes.splice(index + 1, parent.children.length - 1 - index);
                    node.children.push(...rest.map(makeRef));
                    setActive(node.id);
                  }
                }
                break;
              }

              case 'next': {
                if (index > 0) {
                  // TDOO(burdon): Throws error: Ref: Predicate refinement failure.
                  // const [ref] = parent.children.splice(index, 1);
                  // const previous = nodes[index - 1];
                  // previous.children.push(ref);
                  const previous = nodes[index - 1];
                  previous.children.push(makeRef(node));
                  parent.children.splice(index, 1);
                  setActive(node.id);
                }
                break;
              }
            }
            break;
          }

          //
          // Move.
          // TODO(burdon): Atomic?
          //
          case 'move': {
            switch (event.direction) {
              case 'previous': {
                if (index > 0) {
                  const [ref] = parent.children.splice(index, 1);
                  parent.children.splice(index - 1, 0, ref);
                }
                break;
              }

              case 'next': {
                if (index < parent.children.length - 1) {
                  const [ref] = parent.children.splice(index, 1);
                  parent.children.splice(index + 1, 0, ref);
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

    // TODO(burdon): Delete or preserve children?
    const handleDelete = useCallback<NonNullable<ChildNodesProps['onDelete']>>(
      (parent, node) => {
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
      },
      [root],
    );

    // TODO(burdon): Convert to grid.
    return (
      <div className={mx('flex flex-col grow overflow-hidden', classNames)}>
        <div className='flex flex-col grow overflow-hidden'>
          <div ref={scrollRef} className='flex flex-col overflow-y-auto scrollbar-thin'>
            <ChildNodes
              key={root.id}
              parent={root}
              indent={0}
              active={active}
              setEditor={setEditor}
              onEvent={handleEvent}
              onDelete={handleDelete}
            />
          </div>
        </div>

        {/* Statusbar */}
        <div className='flex shrink-0 h-[40px] p-1 justify-center items-center text-xs text-subdued'>{active}</div>
      </div>
    );
  },
);

type ChildNodesProps = {
  parent: TreeNodeType;
  indent: number;
  active?: string;
  setEditor: (editor: NodeEditorController) => void;
  onDelete: (parent: TreeNodeType, node: TreeNodeType) => void;
  onEvent: (event: NodeEditorEvent & { parent: TreeNodeType }) => void;
} & Omit<NodeEditorProps, 'ref' | 'node' | 'classNames' | 'onEvent' | 'onDelete'>;

const ChildNodes = ({ parent, indent, setEditor, active, onEvent, onDelete, ...props }: ChildNodesProps) => {
  return getChildNodes(parent).map((node) => (
    <Fragment key={node.id}>
      <NodeEditor
        ref={node.id === active ? setEditor : null}
        node={node}
        classNames={mx('border-l-4', node.id === active ? 'border-primary-500' : 'border-transparent text-subdued')}
        indent={indent}
        onEvent={(event) => onEvent?.({ ...event, parent })}
        onDelete={(node) => onDelete?.(parent, node)}
        {...props}
      />
      <ChildNodes
        parent={node}
        indent={indent + 1}
        active={active}
        setEditor={setEditor}
        onEvent={onEvent}
        onDelete={onDelete}
        {...props}
      />
    </Fragment>
  ));
};

export const Outliner = {
  Root: OutlinerRoot,
  Editor: NodeEditor,
};

export type { OutlinerRootProps, OutlinerController, NodeEditorProps };
