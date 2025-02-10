//
// Copyright 2025 DXOS.org
//

import React, { type JSX, type PropsWithChildren, useEffect, useState } from 'react';

import { Icon } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

const duration = 200;

// TODO(burdon): Externalize toggle state.
export const ToggleContainer = ({
  title,
  icon,
  toggle,
  defaultOpen,
  children,
}: PropsWithChildren<{ title?: string; icon?: JSX.Element; defaultOpen?: boolean; toggle?: boolean }>) => {
  const [expand, setExpand] = useState(defaultOpen || !toggle);
  const [expandX, setExpandX] = useState(expand);
  const [expandY, setExpandY] = useState(expand);
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
          {icon}
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
