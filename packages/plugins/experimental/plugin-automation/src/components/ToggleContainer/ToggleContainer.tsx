//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, useEffect, useState } from 'react';

import { Icon } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

const duration = 200;

// TODO(burdon): Set default open/close.
// TODO(burdon): Open/close is reset after streaming stops. Memoize?
export const ToggleContainer = ({
  title,
  toggle,
  children,
}: PropsWithChildren<{ title?: string; toggle?: boolean }>) => {
  const [expand, setExpand] = useState(true);
  const [expandX, setExpandX] = useState(true);
  const [expandY, setExpandY] = useState(true);
  useEffect(() => {
    let t;
    if (expand) {
      setExpandX(true);
      t = setTimeout(() => {
        setExpandY(true);
      }, duration);
    } else {
      setExpandY(false);
      t = setTimeout(() => {
        setExpandX(false);
      }, duration);
    }

    return () => clearTimeout(t);
  }, [expand]);

  return (
    <div>
      {title && (
        <div
          className='flex gap-1 py-1 items-center text-sm text-subdued cursor-pointer select-none'
          onClick={toggle ? () => setExpand((open) => !open) : undefined}
        >
          {toggle && (
            <Icon
              size={4}
              icon={'ph--caret-right--regular'}
              style={{ transitionDuration: `${duration * 2}ms` }}
              classNames={['transition transition-transform ease-in-out', expand ? 'rotate-90' : 'transform-none']}
            />
          )}
          <div className='flex-1 truncate'>{title}</div>
        </div>
      )}
      <div
        style={{ transitionDuration: `${duration}ms` }}
        className={mx(
          'grid transition-[grid-template-columns] ease-in-out',
          expandX ? 'grid-cols-[1fr]' : 'grid-cols-[0fr]',
        )}
      >
        <div className='overflow-hidden'>
          <div
            style={{ transitionDuration: `${duration}ms` }}
            className={mx(
              'grid transition-[grid-template-rows] ease-in-out',
              expandY ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
            )}
          >
            <div className={mx('overflow-hidden transition-opacity')}>{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
