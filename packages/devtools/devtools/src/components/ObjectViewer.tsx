//
// Copyright 2025 DXOS.org
//

import React, { type ComponentType, type JSX } from 'react';

import { DXN } from '@dxos/keys';
import { Clipboard, Input } from '@dxos/react-ui';
import { SyntaxHighlighter, createElement } from '@dxos/react-ui-syntax-highlighter';

export type ObjectViewerProps = {
  object: any;
  /**
   * Renders a copyable link to the object.
   * Prefer to use the DXN from the object.
   */
  id?: string;
  onNavigate?: (dxn: DXN) => void;
};

/**
 * Renders a JSON object with navigatable DXN links.
 */
export const ObjectViewer = ({ object, id, onNavigate }: ObjectViewerProps) => {
  const text = JSON.stringify(object, null, 2);

  const rowRenderer = ({
    rows,
    stylesheet,
    useInlineStyles,
  }: {
    rows: rendererNode[];
    stylesheet: any;
    useInlineStyles: any;
  }) => {
    /**
     * Changes the "dxn:..." span to an anchor tag that navigates to the object.
     */
    const addDxnLinks = (node: rendererNode) => {
      if (isDxnSpanNode(node)) {
        node.tagName = 'a';
        node.properties ??= { className: [] };
        node.properties.className.push('underline', 'cursor-pointer');
        node.properties.onClick = () => {
          onNavigate?.(DXN.parse((node.children![0].value as string).slice(1, -1)));
        };
      } else {
        node.children?.forEach(addDxnLinks);
      }
    };

    rows.forEach(addDxnLinks);

    return rows.map((row, index) =>
      createElement({
        node: row,
        stylesheet,
        style: {},
        useInlineStyles,
        key: index,
      }),
    );
  };

  return (
    <>
      {id && (
        <Clipboard.Provider>
          <div className='flex flex-col'>
            <Input.Root>
              <div role='none' className='flex flex-col gap-1'>
                <div role='none' className='flex gap-1'>
                  <Input.TextInput disabled value={id} />
                  <Clipboard.IconButton value={id} />
                </div>
              </div>
            </Input.Root>
          </div>
        </Clipboard.Provider>
      )}
      <SyntaxHighlighter language='json' classNames='text-sm' renderer={rowRenderer}>
        {text}
      </SyntaxHighlighter>
    </>
  );
};

interface rendererNode {
  type: 'element' | 'text';
  value?: string | number | undefined;
  tagName?: keyof JSX.IntrinsicElements | ComponentType<any> | undefined;
  properties?: { className: any[]; [key: string]: any };
  children?: rendererNode[];
}

const isDxnSpanNode = (node: rendererNode) =>
  node.type === 'element' &&
  node.tagName === 'span' &&
  node.children?.length === 1 &&
  node.children[0].type === 'text' &&
  typeof node.children[0].value === 'string' &&
  node.children[0].value.match(/^"(dxn:[^"]+)"$/);
