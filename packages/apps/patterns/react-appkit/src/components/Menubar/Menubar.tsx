//
// Copyright 2022 DXOS.org
//

import * as ToolbarPrimitive from '@radix-ui/react-toolbar';
import throttle from 'lodash.throttle';
import React, { PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';

import { mx } from '@dxos/react-components';

export type MenubarProps = PropsWithChildren<{}>;

export const Separator = ToolbarPrimitive.Separator;

/**
 * A fixed header bar
 * @param props props
 * @returns ReactNode
 */
export const Menubar = ({ children }: MenubarProps) => {
  const [atTop, setAtTop] = useState(true);

  const handleScroll = useCallback(() => {
    const scrollY = document.defaultView?.scrollY ?? 0;
    setAtTop(scrollY < 8);
  }, []);

  const throttledHandleScroll = useMemo(() => throttle(handleScroll, 100), [handleScroll]);

  useEffect(() => {
    throttledHandleScroll();
    document.defaultView?.addEventListener('scroll', throttledHandleScroll);
    return () => document.defaultView?.removeEventListener('scroll', throttledHandleScroll);
  }, [throttledHandleScroll]);

  return (
    <>
      <ToolbarPrimitive.Root
        className={mx(
          'fixed inset-inline-0 block-start-0 z-[2] transition-[backdrop-filter,background-color]',
          'flex items-center gap-x-2 gap-y-4 pli-4 bs-16',
          atTop ? 'pointer-events-none' : 'backdrop-blur-md bg-white/20 dark:bg-neutral-700/20'
        )}
      >
        {children}
      </ToolbarPrimitive.Root>
    </>
  );
};
