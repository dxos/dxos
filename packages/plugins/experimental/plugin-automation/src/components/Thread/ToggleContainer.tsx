//
// Copyright 2025 DXOS.org
//

import React, { type JSX, type PropsWithChildren, useEffect, useState } from 'react';

import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type ToggleContainerProps = ThemedClassName<
  PropsWithChildren<{
    title?: string;
    icon?: JSX.Element;
    toggle?: boolean;
    defaultOpen?: boolean;
    duration?: number;
    /** Should shrink the width when closed. */
    shrinkX?: boolean;
  }>
>;

// TODO(burdon): Externalize toggle state.
export const ToggleContainer = ({
  title,
  icon,
  toggle,
  defaultOpen,
  duration = 400,
  shrinkX = false,
  children,
  classNames,
}: ToggleContainerProps) => {
  const [expand, setExpand] = useState(defaultOpen || !toggle);
  const [expandX, setExpandX] = useState(shrinkX ? expand : true);
  const [expandY, setExpandY] = useState(expand);

  useEffect(() => {
    let t: NodeJS.Timeout;
    if (expand) {
      if (shrinkX) {
        setExpandX(true);
      }
      t = setTimeout(
        () => {
          setExpandY(true);
        },
        shrinkX ? duration : 0,
      );
    } else {
      setExpandY(false);
      if (shrinkX) {
        t = setTimeout(() => {
          setExpandX(false);
        }, duration);
      }
    }

    return () => clearTimeout(t);
  }, [expand]);

  return (
    <div className={mx('overflow-hidden', classNames)}>
      {title && (
        <div
          className='flex gap-1 py-1 items-center text-sm text-subdued cursor-pointer select-none'
          onClick={toggle ? () => setExpand((open) => !open) : undefined}
        >
          {toggle && (
            <div className='flex w-[24px] h-[24px] items-center justify-center'>
              <Icon
                size={4}
                icon={'ph--caret-right--regular'}
                style={{ transitionDuration: `${shrinkX ? duration * 2 : duration}ms` }}
                classNames={['transition transition-transform ease-in-out', expand ? 'rotate-90' : 'transform-none']}
              />
            </div>
          )}
          <div className='flex-1 pis-1 pie-1 truncate'>{title}</div>
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
            <div className={mx('flex overflow-hidden transition-opacity')}>{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
