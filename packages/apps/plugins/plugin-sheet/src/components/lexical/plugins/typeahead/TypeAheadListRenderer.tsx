//
// Copyright 2024 DXOS.org
//

import { type LexicalEditor } from 'lexical';
import React, { type ReactNode, type RefObject } from 'react';

import { TypeAheadItemRenderer } from './TypeAheadItemRenderer';

// TODO(bvaughn) Use react-window to render list?

export const TypeAheadListRenderer = ({
  dataTestId,
  dataTestName = 'TypeAheadPopup-List',
  editor,
  itemClassName,
  items,
  itemRenderer,
  listClassName,
  popupRef,
  query,
  selectedItem,
}: {
  dataTestId?: string;
  dataTestName?: string;
  editor: LexicalEditor;
  itemClassName: string;
  itemRenderer: (item: string, query: string) => ReactNode;
  items: string[];
  listClassName: string;
  popupRef: RefObject<HTMLDivElement>;
  query: string;
  selectedItem: string | null;
}) => (
  <div
    className={`${listClassName} absolute top-0 left-0 max-h-36 w-56 overflow-y-auto overflow-x-hidden select-none rounded z-10 bg-slate-950`}
    data-test-id={dataTestId}
    data-test-name={dataTestName}
    ref={popupRef}
  >
    {items.map((item, index) => (
      <TypeAheadItemRenderer
        dataTestId={dataTestId ? `${dataTestId}-Item-${index}` : undefined}
        dataTestName={dataTestName ? `${dataTestName}-Item` : undefined}
        className={itemClassName}
        editor={editor}
        key={index}
        isSelected={selectedItem === items[index]}
        item={item}
        itemRenderer={itemRenderer}
        query={query}
      />
    ))}
  </div>
);
