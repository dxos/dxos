//
// Copyright 2022 DXOS.org
//

import * as ToolbarPrimitive from '@radix-ui/react-toolbar';
import throttle from 'lodash.throttle';
import React, { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { mx } from '@dxos/react-ui';

import { ProfileMenu, ProfileMenuProps } from './ProfileMenu';
import { SpaceLink, SpaceLinkProps } from './SpaceLink';
import { SpaceMenu, SpaceMenuProps } from './SpaceMenu';
import { SpacesLink, SpacesLinkProps } from './SpacesLink';

export interface MenubarProps extends ProfileMenuProps, SpaceLinkProps, Partial<SpaceMenuProps>, SpacesLinkProps {
  children?: ReactNode;
}

export const Menubar = ({
  children,
  profile,
  space,
  onClickManageProfile,
  onClickGoToSpaces,
  onClickGoToSpace,
  onClickManageSpace
}: MenubarProps) => {
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
        {onClickGoToSpaces && <SpacesLink {...{ onClickGoToSpaces }} />}
        <ToolbarPrimitive.Separator className='grow' />
        {space &&
          (onClickGoToSpace ? (
            <SpaceLink {...{ onClickGoToSpace }} />
          ) : (
            onClickManageSpace && <SpaceMenu {...{ space, onClickManageSpace }} />
          ))}
        <ToolbarPrimitive.Button asChild>
          <ProfileMenu {...{ profile, onClickManageProfile }} />
        </ToolbarPrimitive.Button>
      </ToolbarPrimitive.Root>
      {children && (
        <div
          role='none'
          className='fixed inset-inline-0 block-start-0 z-[2] bs-16 flex items-center justify-center pointer-events-none'
        >
          {children}
        </div>
      )}
    </>
  );
};
