//
// Copyright 2023 DXOS.org
//

import { Users } from '@phosphor-icons/react';
import React, { FC } from 'react';

import { IntentPluginProvides } from '@braneframe/plugin-intent';
import { Avatar, AvatarGroup, AvatarGroupItem, Button, Tooltip, useTranslation } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { useMembers, Space, useSpace } from '@dxos/react-client/echo';
import { Identity, useIdentity } from '@dxos/react-client/halo';
import { findPlugin, usePlugins } from '@dxos/react-surface';

import { SPACE_PLUGIN, SpaceAction, SpacePluginProvides } from '../types';

export const SpacePresence = () => {
  const { plugins } = usePlugins();
  const spacePlugin = findPlugin<SpacePluginProvides>(plugins, 'dxos.org/plugin/space');
  const intentPlugin = findPlugin<IntentPluginProvides>(plugins, 'dxos.org/plugin/intent');
  const space = spacePlugin?.provides.space.active;
  const defaultSpace = useSpace();
  const identity = useIdentity();
  if (!identity) {
    return null;
  }

  // TODO(burdon): Error when popup appears (BUT DOES NOT GET CAUGHT BY DebugStatus!)
  //  Warning: React does not recognize the `labelId` prop on a DOM element.
  //  If you intentionally want it to appear in the DOM as a custom attribute,
  //  spell it as lowercase `labelid` instead. If you accidentally passed it from a parent component, remove it from the DOM element.
  const handleShare = () => {
    void intentPlugin!.provides.intent.sendIntent({
      plugin: SPACE_PLUGIN,
      action: SpaceAction.SHARE,
      data: { spaceKey: space!.key.toHex() },
    });
  };

  if (!space || defaultSpace?.key.equals(space.key)) {
    return null;
  }

  return (
    <div className='flex items-center'>
      {intentPlugin && (
        <Button variant='ghost' onClick={handleShare}>
          <Users className={getSize(5)} />
        </Button>
      )}
      <SpaceMembers space={space} identity={identity} />
    </div>
  );
};

// TODO(burdon): Don't include current user.
const SpaceMembers: FC<{ space: Space; identity: Identity }> = ({ space, identity }) => {
  const members = useMembers(space.key);
  const { t } = useTranslation(SPACE_PLUGIN);
  return (
    <Tooltip.Root>
      <Tooltip.Trigger className='flex items-center'>
        <AvatarGroup.Root size={4} classNames='mie-5'>
          <AvatarGroup.Label classNames='text-xs font-system-semibold'>{members.length}</AvatarGroup.Label>
          {members.map((member) => (
            <AvatarGroupItem.Root key={member.identity.identityKey.toHex()}>
              <Avatar.Frame>
                {/* TODO(burdon): Why `href`? */}
                <Avatar.Fallback href={member.identity.profile?.displayName ?? member.identity.identityKey.toHex()} />
              </Avatar.Frame>
            </AvatarGroupItem.Root>
          ))}
        </AvatarGroup.Root>
      </Tooltip.Trigger>
      <Tooltip.Content collisionPadding={4}>
        <span>{t('presence label')}</span>
        <Tooltip.Arrow />
      </Tooltip.Content>
    </Tooltip.Root>
  );
};
