//
// Copyright 2025 DXOS.org
//

import React, { type FC, useCallback, useEffect, useRef, useState } from 'react';

import { RefArray } from '@dxos/live-object';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type NodeEditorProps, NodeEditor, type NodeEditorController } from './ItemEditor';
import { type TreeNodeType } from '../../types';

type OutlinerRootProps = ThemedClassName<{
  node: TreeNodeType;
  selected?: string;
  onSelect?: (id: string) => void; // TODO(burdon): Selection Model. Array of ids? Multiple?
  onCreate?: (parent: TreeNodeType, previous: TreeNodeType, text?: string) => void;
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

  const handleNavigate = useCallback<NonNullable<NodeEditorProps['onNavigate']>>(
    ({ parent, node, direction }) => {
      const nodes = RefArray.allResolvedTargets(parent?.children ?? []);
      const index = nodes.findIndex((n) => n.id === node.id);
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
    [root, onDelete],
  );

  const nodes = RefArray.allResolvedTargets(root.children ?? []);

  // TODO(burdon): Hierarchical layout.
  // TODO(burdon): Convert to grid.
  return (
    <div className={mx('flex flex-col grow overflow-hidden', classNames)}>
      <div className='flex flex-col grow overflow-hidden'>
        <div ref={scrollRef} className='flex flex-col overflow-y-auto scrollbar-thin'>
          {nodes.map((node) => (
            <NodeEditor
              key={node.id}
              ref={node.id === selected ? setEditor : null}
              classNames={mx(node.id === selected ? 'bg-hoverSurface' : 'text-subdued', 'hover:bg-hoverSurface')}
              node={node}
              onFocus={(node) => onSelect?.(node.id)}
              onNavigate={(event) => handleNavigate({ ...event, parent: root })}
              onCreate={(node, text) => onCreate?.(root, node, text)}
              onDelete={(node) => handleDelete(root, node)}
            />
          ))}
        </div>
      </div>

      {/* Statusbar */}
      <div className='flex shrink-0 h-[40px] p-1 justify-center items-center text-xs text-subdued'>{selected}</div>
    </div>
  );
};

export const Outliner = {
  Root: OutlinerRoot,
  Editor: NodeEditor,
};

export type { OutlinerRootProps, NodeEditorProps };
