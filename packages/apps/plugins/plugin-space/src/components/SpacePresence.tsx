//
// Copyright 2023 DXOS.org
//

import { PaperPlaneRight } from '@phosphor-icons/react';
import React, { FC } from 'react';

import { Avatar, AvatarGroup, AvatarGroupItem, Button, Tooltip, useJdenticonHref, useTranslation } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
// import { Space } from '@dxos/react-client/echo';
import { Identity, useIdentity } from '@dxos/react-client/halo';

import { SPACE_PLUGIN } from '../types';

// TODO(burdon): Use FC signature throughout?
export const SpacePresence: FC<{ data: any }> = ({ data, ...rest }) => {
  const identity = useIdentity();
  if (!identity) {
    return null;
  }

  return (
    <div className='flex items-center'>
      {/* TODO(burdon): Reuse SpaceAction.SHARE action/intent. */}
      <Button variant='ghost'>
        <PaperPlaneRight className={getSize(5)} />
      </Button>
      <SpaceMembers identity={identity} />
    </div>
  );
};

// TODO(burdon): Wire up to presence (for space).
const SpaceMembers: FC<{ identity: Identity }> = ({ identity }) => {
  const fallbackHref = useJdenticonHref(identity?.identityKey.toHex() ?? '', 4);
  const { t } = useTranslation(SPACE_PLUGIN);
  return (
    <Tooltip.Root>
      <Tooltip.Trigger className='flex items-center'>
        <AvatarGroup.Root size={4} classNames='mie-5'>
          <AvatarGroup.Label classNames='text-xs font-system-semibold'>1</AvatarGroup.Label>
          <AvatarGroupItem.Root>
            <Avatar.Frame>
              <Avatar.Fallback href={fallbackHref} />
            </Avatar.Frame>
          </AvatarGroupItem.Root>
        </AvatarGroup.Root>
      </Tooltip.Trigger>
      <Tooltip.Content collisionPadding={4}>
        <span>{t('presence label')}</span>
        <Tooltip.Arrow />
      </Tooltip.Content>
    </Tooltip.Root>
  );
};
