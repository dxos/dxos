//
// Copyright 2024 DXOS.org
//

import { type LexicalEditor } from 'lexical';
import React, { useLayoutEffect, useRef, type ReactNode } from 'react';

import { INSERT_ITEM_COMMAND } from './commands';

export const TypeAheadItemRenderer = ({
  className,
  dataTestId,
  dataTestName = 'TypeAheadPopup-List-Item',
  editor,
  isSelected,
  item,
  itemRenderer,
  query,
}: {
  className: string;
  dataTestId?: string;
  dataTestName?: string;
  editor: LexicalEditor;
  isSelected: boolean;
  item: string;
  itemRenderer: (item: string, query: string) => ReactNode;
  query: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  // Scroll selected items into view
  useLayoutEffect(() => {
    if (isSelected) {
      const element = ref.current;
      if (element) {
        element.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [isSelected]);

  const onClick = () => {
    editor.dispatchCommand(INSERT_ITEM_COMMAND, { item });
  };

  return (
    <div
      className={`${className} text-slate-50 pointer leading-5 px-1 hover:bg-slate-900 ${isSelected ? 'bg-slate-900' : ''}`}
      data-test-id={dataTestId}
      data-test-name={dataTestName}
      onClick={onClick}
      ref={ref}
    >
      {itemRenderer(item, query)}
    </div>
  );
};
