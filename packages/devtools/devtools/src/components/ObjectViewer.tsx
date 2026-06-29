//
// Copyright 2025 DXOS.org
//

import React, { type JSX, type ComponentType, useCallback } from 'react';

import { URI } from '@dxos/keys';
import { Button, Clipboard, Input } from '@dxos/react-ui';
import { JsonHighlighter, createElement } from '@dxos/react-ui-syntax-highlighter';

export type ObjectViewerProps = {
  object: any;
  /**
   * Renders a copyable link to the object.
   * Prefer to use the DXN from the object.
   */
  id?: string;
  onNavigate?: (dxn: URI.URI) => void;
};

/**
 * Renders a JSON object with navigatable DXN links.
 */
export const ObjectViewer = ({ object, id, onNavigate }: ObjectViewerProps) => {
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
          onNavigate?.(URI.make((node.children![0].value as string).slice(1, -1)));
        };
      } else {
        node.children?.forEach(addDxnLinks);
      }
    };

    rows.forEach(addDxnLinks);

    return rows.map((row, index) => {
      return createElement({
        node: row,
        stylesheet,
        style: {},
        useInlineStyles,
        key: index,
      });
    });
  };

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(JSON.stringify(object, null, 2));
  }, [object]);

  return (
    <>
      {id && (
        <Clipboard.Provider>
          <div className='flex flex-col'>
            <Input.Root>
              <div className='flex flex-col gap-1'>
                <div className='flex gap-1'>
                  <Input.TextInput disabled value={id} />
                  <Clipboard.IconButton value={id} />
                  <Button value={id} onClick={handleCopy}>
                    Copy JSON
                  </Button>
                </div>
              </div>
            </Input.Root>
          </div>
        </Clipboard.Provider>
      )}
      <JsonHighlighter data={object} classNames='text-sm' renderer={rowRenderer} />
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

const isDxnSpanNode = (node: rendererNode) => {
  return (
    node.type === 'element' &&
    node.tagName === 'span' &&
    node.children?.length === 1 &&
    node.children[0].type === 'text' &&
    typeof node.children[0].value === 'string' &&
    node.children[0].value.match(/^"(dxn:[^"]+)"$/)
  );
};
