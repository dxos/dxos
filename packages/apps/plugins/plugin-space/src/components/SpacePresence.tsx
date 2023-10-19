//
// Copyright 2023 DXOS.org
//

import { Users } from '@phosphor-icons/react';
import React, { type FC } from 'react';

import { type IntentPluginProvides } from '@braneframe/plugin-intent';
import { type SplitViewPluginProvides } from '@braneframe/plugin-splitview';
import { useSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { usePlugin } from '@dxos/react-surface';
import { Avatar, AvatarGroup, AvatarGroupItem, Button, Tooltip, useTranslation } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

import { SPACE_PLUGIN, SpaceAction, type SpacePluginProvides, type ObjectViewer } from '../types';

export const SpacePresence = () => {
  const spacePlugin = usePlugin<SpacePluginProvides>(SPACE_PLUGIN);
  const intentPlugin = usePlugin<IntentPluginProvides>('dxos.org/plugin/intent');
  const splitViewPlugin = usePlugin<SplitViewPluginProvides>('dxos.org/plugin/splitview');
  const space = spacePlugin?.provides.space.active;
  const defaultSpace = useSpace();
  const identity = useIdentity();

  if (!identity || !spacePlugin) {
    return null;
  }

  // TODO(burdon): Error when popup appears (BUT DOES NOT GET CAUGHT BY DebugStatus!)
  //  Warning: React does not recognize the `labelId` prop on a DOM element.
  //  If you intentionally want it to appear in the DOM as a custom attribute,
  //  spell it as lowercase `labelid` instead. If you accidentally passed it from a parent component, remove it from the DOM element.
  const handleShare = () => {
    void intentPlugin!.provides.intent.dispatch({
      plugin: SPACE_PLUGIN,
      action: SpaceAction.SHARE,
      data: { spaceKey: space!.key.toHex() },
    });
  };

  if (!space || defaultSpace?.key.equals(space.key)) {
    return null;
  }

  const viewers = spacePlugin.provides.space.viewers.filter((viewer) => {
    return (
      space.key.equals(viewer.spaceKey) &&
      splitViewPlugin?.provides.splitView.active === viewer.objectId &&
      Date.now() - viewer.lastSeen < 30_000
    );
  });

  return (
    <div className='flex items-center'>
      {intentPlugin && (
        <Button variant='ghost' onClick={handleShare}>
          <Users className={getSize(5)} />
        </Button>
      )}
      <ObjectViewers viewers={viewers} />
    </div>
  );
};

const ObjectViewers: FC<{ viewers: ObjectViewer[] }> = ({ viewers }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  return (
    <Tooltip.Root>
      <Tooltip.Trigger className='flex items-center'>
        <AvatarGroup.Root size={4} classNames='mie-5'>
          <AvatarGroup.Label classNames='text-xs font-system-semibold'>{viewers.length}</AvatarGroup.Label>
          {viewers.map((viewer) => (
            <AvatarGroupItem.Root key={viewer.identityKey.toHex()}>
              <Avatar.Frame>
                {/* TODO(burdon): Why `href`? */}
                <Avatar.Fallback href={viewer.identityKey.toHex()} />
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
