//
// Copyright 2026 DXOS.org
//

//
// SPIKE. A stock zag machine consumed as-is: `@zag-js/splitter` supplies the whole resize
// interaction (pointer, keyboard, cursor management) and the wrapper is prop spreading plus
// theme classes — the shape a registry-provided machine capability would take.
//

import { normalizeProps, useMachine } from '@zag-js/react';
import * as splitter from '@zag-js/splitter';
import React, { type ReactNode, useId } from 'react';

export type SplitterProps = {
  /** `horizontal` splits side by side; `vertical` stacks the panes. */
  orientation?: 'horizontal' | 'vertical';
  /** Start and end pane contents. */
  panes: [ReactNode, ReactNode];
};

/** Two resizable panes around a draggable, keyboard-operable divider. */
export const Splitter = ({ orientation = 'horizontal', panes }: SplitterProps) => {
  const service = useMachine(splitter.machine, {
    id: useId(),
    orientation,
    defaultSize: [50, 50],
    panels: [
      { id: 'start', minSize: 15 },
      { id: 'end', minSize: 15 },
    ],
  });
  const api = splitter.connect(service, normalizeProps);

  return (
    <div {...api.getRootProps()} className='dx-grow'>
      <div {...api.getPanelProps({ id: 'start' })} className='flex flex-col dx-grow overflow-hidden'>
        {panes[0]}
      </div>
      <div
        {...api.getResizeTriggerProps({ id: 'start:end' })}
        className={
          orientation === 'horizontal'
            ? 'shrink-0 w-1 cursor-col-resize bg-separator hover:bg-active-separator'
            : 'shrink-0 h-1 cursor-row-resize bg-separator hover:bg-active-separator'
        }
      />
      <div {...api.getPanelProps({ id: 'end' })} className='flex flex-col min-w-0 min-h-0 overflow-hidden'>
        {panes[1]}
      </div>
    </div>
  );
};
