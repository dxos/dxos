//
// Copyright 2023 DXOS.org
//

import { Users } from '@phosphor-icons/react';
import React from 'react';

import {
  parseGraphPlugin,
  parseIntentPlugin,
  parseLayoutPlugin,
  usePlugin,
  useResolvePlugin,
} from '@dxos/app-framework';
import { useSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import {
  Avatar,
  AvatarGroup,
  AvatarGroupItem,
  DensityProvider,
  type Size,
  Tooltip,
  useTranslation,
  Button,
} from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { SPACE_PLUGIN, SpaceAction, type SpacePluginProvides, type ObjectViewer } from '../types';
import { getActiveSpace } from '../util';

export const SpacePresence = () => {
  const spacePlugin = usePlugin<SpacePluginProvides>(SPACE_PLUGIN);
  const intentPlugin = useResolvePlugin(parseIntentPlugin);
  const layoutPlugin = useResolvePlugin(parseLayoutPlugin);
  const graphPlugin = useResolvePlugin(parseGraphPlugin);
  const defaultSpace = useSpace();
  const identity = useIdentity();

  if (!identity || !spacePlugin || !layoutPlugin || !intentPlugin || !graphPlugin) {
    return null;
  }

  const space = getActiveSpace(graphPlugin.provides.graph, layoutPlugin.provides.layout.active);

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
      layoutPlugin?.provides.layout.active === viewer.objectId &&
      Date.now() - viewer.lastSeen < 30_000
    );
  });

  return <ObjectPresence onShareClick={handleShare} viewers={viewers} />;
};

export type ObjectPresenceProps = {
  size?: Size;
  viewers?: ObjectViewer[];
  showCount?: boolean;
  onShareClick?: () => void;
};

export const ObjectPresence = (props: ObjectPresenceProps) => {
  const {
    onShareClick,
    viewers = [],
    size = 4,
    showCount = !props?.size || (props.size !== 'px' && props.size > 4),
  } = props;
  const { t } = useTranslation(SPACE_PLUGIN);
  return (
    <Tooltip.Root>
      <Tooltip.Trigger className={mx('px-1 m-1 flex items-center')} onClick={onShareClick}>
        {onShareClick && viewers.length === 0 && (
          <DensityProvider density={'fine'}>
            <Users className={mx(getSize(5), 'm-1')} />
          </DensityProvider>
        )}
        {viewers.length > 0 && (
          <AvatarGroup.Root size={size} classNames={'' + (size !== 'px' && size > 3 ? 'm-2 mie-4' : 'm-1 mie-2')}>
            {viewers.length > 3 && showCount && (
              <AvatarGroup.Label classNames='text-xs font-system-semibold'>{viewers.length}</AvatarGroup.Label>
            )}
            {viewers.slice(0, 3).map((viewer, i) => (
              <AvatarGroupItem.Root key={viewer.identityKey.toHex()} color={viewer.color}>
                <Avatar.Frame style={{ zIndex: viewers.length - i }}>
                  <Avatar.Fallback href={viewer.identityKey.toHex()} />
                </Avatar.Frame>
              </AvatarGroupItem.Root>
            ))}
          </AvatarGroup.Root>
        )}
      </Tooltip.Trigger>
      <Tooltip.Content collisionPadding={4}>
        <span>{viewers.length > 0 ? viewers.length + ' ' + t('presence label') : t('share space')}</span>
        <Tooltip.Arrow />
      </Tooltip.Content>
    </Tooltip.Root>
  );
};
