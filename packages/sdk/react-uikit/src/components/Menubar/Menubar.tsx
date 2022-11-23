//
// Copyright 2022 DXOS.org
//

import * as ToolbarPrimitive from '@radix-ui/react-toolbar';
import React from 'react';

import { ProfileMenu, ProfileMenuProps } from './ProfileMenu';
import { SpaceLinkProps } from './SpaceLink';
import { SpaceMenuProps } from './SpaceMenu';
import { SpacesLink, SpacesLinkProps } from './SpacesLink';

export interface MenubarProps extends ProfileMenuProps, SpaceLinkProps, Partial<SpaceMenuProps>, SpacesLinkProps {}

export const Menubar = ({ profile, onClickManageProfile, onClickGoToSpaces }: MenubarProps) => {
  return (
    <ToolbarPrimitive.Root>
      {onClickGoToSpaces && <SpacesLink {...{ onClickGoToSpaces }} />}
      <ToolbarPrimitive.Button asChild>
        <ProfileMenu {...{ profile, onClickManageProfile }} />
      </ToolbarPrimitive.Button>
    </ToolbarPrimitive.Root>
  );
};
