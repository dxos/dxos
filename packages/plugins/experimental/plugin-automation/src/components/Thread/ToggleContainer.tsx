//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, useRef, useState } from 'react';

import { Icon } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

// TODO(burdon): Determine if streaming.
// TODO(burdon): Typewriter effect if streaming.
// TODO(burdon): Open/close is reset after streaming stops. Memoize?
export const ToggleContainer = ({
  title,
  toggle,
  children,
}: PropsWithChildren<{ title?: string; toggle?: boolean }>) => {
  // TODO(burdon): Set default.
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      {title && (
        <div
          className='flex w-full gap-1 py-1 items-center text-sm text-subdued cursor-pointer select-none'
          onClick={toggle ? () => setOpen(!open) : undefined}
        >
          {toggle && (
            <Icon
              size={4}
              icon={'ph--caret-right--regular'}
              classNames={['transition transition-transform duration-200', open ? 'rotate-90' : 'transform-none']}
            />
          )}
          <div className='flex-1 truncate'>{title}</div>
        </div>
      )}
      <div
        className={mx('transition-[height] duration-500 overflow-hidden')}
        style={{
          height: open ? `${contentRef.current?.scrollHeight}px` : '0px',
        }}
      >
        <div ref={contentRef} className={mx('transition-opacity duration-500', open ? 'opactity-100' : 'opacity-0')}>
          {children}
        </div>
      </div>
    </div>
  );
};
