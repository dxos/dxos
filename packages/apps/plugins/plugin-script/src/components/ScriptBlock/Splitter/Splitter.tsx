//
// Copyright 2023 DXOS.org
//

import { Code, SquareSplitHorizontal, Eye } from '@phosphor-icons/react';
import React, { type ReactNode } from 'react';

import { ToggleGroup, ToggleGroupItem, Toolbar } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

export type View = 'editor' | 'preview' | 'split';

export type SplitterProps = {
  view?: View;
  className?: string;
  children?: ReactNode[];
};

// TODO(burdon): Surfaces?
export const Splitter = ({ view = 'split', className, children = [] }: SplitterProps) => {
  const [left, right] = children;
  return (
    <div className={mx('flex overflow-hidden grow', className)}>
      {left && view !== 'preview' && <div className='flex flex-1 shrink-0 overflow-hidden'>{left}</div>}
      {right && view !== 'editor' && <div className='flex flex-1 shrink-0 overflow-hidden'>{right}</div>}
    </div>
  );
};

export type SplitterSelectorProps = {
  view?: View;
  onChange?: (view: View) => void;
  className?: string;
};

export const SplitterSelector = ({ view, onChange, className }: SplitterSelectorProps) => {
  return (
    <Toolbar.Root classNames={className}>
      <ToggleGroup type='single' value={view} onValueChange={(value) => onChange?.(value as View)}>
        <ToggleGroupItem value='editor'>
          <Code className={getSize(5)} />
        </ToggleGroupItem>
        <ToggleGroupItem value='split'>
          <SquareSplitHorizontal className={getSize(5)} />
        </ToggleGroupItem>
        <ToggleGroupItem value='preview'>
          <Eye className={getSize(5)} />
        </ToggleGroupItem>
      </ToggleGroup>
    </Toolbar.Root>
  );
};
