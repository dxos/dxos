//
// Copyright 2025 DXOS.org
//

import React, { type FC, Fragment, useCallback, useEffect, useRef, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { RefArray } from '@dxos/live-object';
import { log } from '@dxos/log';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type NodeEditorProps, NodeEditor, type NodeEditorController } from './ItemEditor';
import { type TreeNodeType } from '../../types';

type OutlinerRootProps = ThemedClassName<{
  node: TreeNodeType;
  selected?: string;
  onSelect?: (id: string) => void; // TODO(burdon): Selection Model. Array of ids? Multiple?
  onCreate?: (parent: TreeNodeType, node: TreeNodeType, text?: string) => void;
  onDelete?: (parent: TreeNodeType, node: TreeNodeType) => void;
}>;

// TODO(burdon): Move selection here.
const OutlinerRoot: FC<OutlinerRootProps> = ({ classNames, node: root, selected, onSelect, onCreate, onDelete }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const [editor, setEditor] = useState<NodeEditorController | null>(null);
  const [direction, setDirection] = useState<'start' | 'end'>();
  useEffect(() => {
    editor?.focus(direction);
  }, [editor, selected, direction]);

  const handleEvent = useCallback<NonNullable<NodeEditorProps['onEvent']>>(
    (event) => {
      log.info('handleEvent', { event });
      const { type, parent, node, direction, text } = event;
      invariant(parent);
      const nodes = RefArray.allResolvedTargets(parent.children);
      const index = nodes.findIndex((n) => n.id === node.id);
      console.log(parent.id, node.id);
      invariant(index !== -1);

      switch (type) {
        //
        // Create.
        //
        case 'create': {
          onCreate?.(parent, node, text);
          break;
        }

        //
        // Indent.
        //
        case 'indent': {
          switch (direction) {
            case 'previous': {
              if (parent.id !== root.id) {
                // TODO(burdon): Insert after parent.
                // const [ref] = parent.children.splice(index, 1);
              }
              break;
            }

            case 'next': {
              if (index > 0) {
                const [ref] = parent.children.splice(index, 1);
                const previous = nodes[index - 1];
                previous.children.push(ref);
              }
              break;
            }
          }
          break;
        }

        //
        // Navigate.
        // TODO(burdon): Navigate hierarchy.
        //
        case 'navigate': {
          switch (direction) {
            case 'previous': {
              if (index > 0) {
                const id = nodes[index - 1].id;
                onSelect?.(id);
                setDirection('start');
              }
              break;
            }

            case 'next': {
              if (index < nodes.length - 1) {
                const id = nodes[index + 1].id;
                onSelect?.(id);
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

  const handleDelete = useCallback<NonNullable<OutlinerRootProps['onDelete']>>(
    (parent, node) => {
      // Only navigate if deleting the current item.
      // const nodes = RefArray.allResolvedTargets(parent.children ?? []);
      // let index = nodes.findIndex((i) => i.id === node.id);

      // console.log('::::', index);
      // if (selected === node.id) {
      //   if (index === 0) {
      //     index++;
      //   } else {
      //     index--;
      //   }
      // } else {
      //   // TODO(burdon): Curently fails to preserve selection.
      //   index = nodes.findIndex((i) => i.id === selected);
      // }

      // console.log(index, nodes.length);
      // if (nodes.length >= index) {
      //   const next = nodes[index];
      //   onSelect?.(next.id);
      // }

      onDelete?.(parent, node);
    },
    [root],
  );

  // TODO(burdon): Hierarchical layout.
  // TODO(burdon): Convert to grid.
  return (
    <div className={mx('flex flex-col grow overflow-hidden', classNames)}>
      <div className='flex flex-col grow overflow-hidden'>
        <div ref={scrollRef} className='flex flex-col overflow-y-auto scrollbar-thin'>
          <ChildNodes
            key={root.id}
            parent={root}
            indent={0}
            selected={selected}
            setEditor={setEditor}
            onEvent={handleEvent}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* Statusbar */}
      <div className='flex shrink-0 h-[40px] p-1 justify-center items-center text-xs text-subdued'>{selected}</div>
    </div>
  );
};

const ChildNodes = ({
  parent,
  indent,
  setEditor,
  selected,
  onEvent,
  onDelete,
  ...props
}: {
  parent: TreeNodeType;
  indent: number;
  selected?: string;
  setEditor: (editor: NodeEditorController) => void;
} & Pick<OutlinerRootProps, 'onDelete'> &
  Omit<NodeEditorProps, 'ref' | 'node' | 'classNames' | 'onDelete'>) => {
  return RefArray.allResolvedTargets(parent.children).map((node) => (
    <Fragment key={node.id}>
      <NodeEditor
        ref={node.id === selected ? setEditor : null}
        node={node}
        classNames={mx(node.id === selected ? 'bg-hoverSurface' : 'text-subdued', 'hover:bg-hoverSurface')}
        indent={indent}
        onEvent={(event) => onEvent?.({ ...event, parent })}
        onDelete={(node) => onDelete?.(parent, node)}
        {...props}
      />
      <ChildNodes
        parent={node}
        indent={indent + 1}
        selected={selected}
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

export type { OutlinerRootProps, NodeEditorProps };
