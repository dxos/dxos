//
// Copyright 2025 DXOS.org
//

import React, { type JSX, type PropsWithChildren, useEffect, useState } from 'react';

import { Icon, type ThemedClassName, useControlledState } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type ToggleContainerProps = ThemedClassName<
  PropsWithChildren<{
    title?: string | JSX.Element;
    icon?: JSX.Element;
    open?: boolean;
    defaultOpen?: boolean;
    duration?: number;
    /** Should shrink the width when closed. */
    shrinkX?: boolean;
    onChangeOpen?: (open: boolean) => void;
  }>
>;

export const ToggleContainer = ({
  classNames,
  title,
  icon,
  open: openParam,
  defaultOpen,
  duration = 250,
  shrinkX = false,
  children,
  onChangeOpen,
}: ToggleContainerProps) => {
  const [open, setOpen] = useControlledState(openParam ?? defaultOpen);
  const [expandX, setExpandX] = useState(shrinkX ? open : true);
  const [expandY, setExpandY] = useState(open);

  useEffect(() => {
    let t: NodeJS.Timeout;
    if (open) {
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
  }, [open]);

  const handleToggle = () => {
    if (onChangeOpen) {
      onChangeOpen(!open);
    } else {
      setOpen((open) => !open);
    }
  };

  return (
    <div className={mx('overflow-hidden', classNames)}>
      {title && (
        <div className='flex py-1 items-center text-sm text-subdued cursor-pointer select-none' onClick={handleToggle}>
          <div className='flex w-[24px] h-[24px] items-center justify-center'>
            <Icon
              size={4}
              icon={'ph--caret-right--regular'}
              style={{ transitionDuration: `${shrinkX ? duration * 2 : duration}ms` }}
              classNames={['transition transition-transform ease-in-out', open ? 'rotate-90' : 'transform-none']}
            />
          </div>
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
