//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type NodeViewProps, TextPart } from '@dxos/react-ui-canvas/scene';
import { mx } from '@dxos/ui-theme';

import { ClassNode } from '#types';

/** A Tailwind size class loses to the node's own `fontSize`, so it is left off when the node sets one. */
const sizeClass = (node: NodeViewProps['node'], className: string) =>
  node.style?.fontSize === undefined ? className : undefined;

/** A UML class: the name over the attribute and method compartments, each edited in place. */
export const ClassNodeView = ({ node, editing }: NodeViewProps) => {
  if (!ClassNode.isClassNode(node)) {
    return null;
  }
  return (
    <div className={mx('dx-cover flex flex-col font-mono divide-y divide-separator', sizeClass(node, 'text-sm'))}>
      <TextPart part='label' text={node.label} editing={editing} classNames='px-2 py-1 text-center font-bold'>
        {node.label}
      </TextPart>
      <TextPart
        part='attributes'
        text={node.attributes.join('\n')}
        editing={editing}
        classNames='px-2 py-1 flex-1 min-h-4'
      >
        {node.attributes.map((attribute, index) => (
          <div key={index}>{attribute}</div>
        ))}
      </TextPart>
      <TextPart part='methods' text={node.methods.join('\n')} editing={editing} classNames='px-2 py-1 flex-1 min-h-4'>
        {node.methods.map((method, index) => (
          <div key={index}>{method}</div>
        ))}
      </TextPart>
    </div>
  );
};
