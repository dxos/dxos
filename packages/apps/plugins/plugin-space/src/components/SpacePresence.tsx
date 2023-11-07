//
// Copyright 2023 DXOS.org
//

import { Users } from '@phosphor-icons/react';
import React from 'react';

import { parseIntentPlugin, usePlugin, useResolvePlugin } from '@dxos/app-framework';
import { type TypedObject, getSpaceForObject, useSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import {
  Avatar,
  AvatarGroup,
  AvatarGroupItem,
  Button,
  type Size,
  type ThemedClassName,
  Tooltip,
  useDensityContext,
  useTranslation,
} from '@dxos/react-ui';
import { getColorForValue, getSize, mx } from '@dxos/react-ui-theme';

import { SPACE_PLUGIN, SpaceAction, type SpacePluginProvides, type ObjectViewer } from '../types';

export const SpacePresence = ({ object }: { object: TypedObject }) => {
  const spacePlugin = usePlugin<SpacePluginProvides>(SPACE_PLUGIN);
  const intentPlugin = useResolvePlugin(parseIntentPlugin);
  const density = useDensityContext();
  const defaultSpace = useSpace();
  const identity = useIdentity();

  if (!identity || !spacePlugin || !intentPlugin) {
    return null;
  }

  const space = getSpaceForObject(object);

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
    return space.key.equals(viewer.spaceKey) && object.id === viewer.objectId && Date.now() - viewer.lastSeen < 30_000;
  });

  return (
    <ObjectPresence
      size={density === 'fine' ? 2 : 4}
      classNames={density === 'fine' ? 'is-6' : 'pli-4'}
      onShareClick={handleShare}
      viewers={viewers}
    />
  );
};

export type ObjectPresenceProps = ThemedClassName<{
  size?: Size;
  viewers?: ObjectViewer[];
  showCount?: boolean;
  onShareClick?: () => void;
}>;

export const ObjectPresence = (props: ObjectPresenceProps) => {
  const {
    onShareClick,
    viewers = [],
    size = 4,
    showCount = !props?.size || (props.size !== 'px' && props.size > 4),
    classNames,
  } = props;
  const { t } = useTranslation(SPACE_PLUGIN);
  const density = useDensityContext();
  return density === 'fine' && viewers.length === 0 ? (
    <div role='none' className={mx(classNames)} />
  ) : (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <Button variant='ghost' classNames={['pli-0', classNames]} onClick={onShareClick}>
          {onShareClick && viewers.length === 0 && <Users className={getSize(4)} />}
          {viewers.length > 0 && (
            <AvatarGroup.Root size={size} classNames={size !== 'px' && size > 3 ? 'm-2 mie-4' : 'm-1 mie-2'}>
              {viewers.length > 3 && showCount && (
                <AvatarGroup.Label classNames='text-xs font-system-semibold'>{viewers.length}</AvatarGroup.Label>
              )}
              {viewers.slice(0, 3).map((viewer, i) => {
                const viewerHex = viewer.identityKey.toHex();
                return (
                  <AvatarGroupItem.Root key={viewerHex} color={getColorForValue({ value: viewerHex, type: 'color' })}>
                    <Avatar.Frame style={{ zIndex: viewers.length - i }}>
                      <Avatar.Fallback href={viewerHex} />
                    </Avatar.Frame>
                  </AvatarGroupItem.Root>
                );
              })}
            </AvatarGroup.Root>
          )}
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side='bottom' classNames='z-[70]'>
          <span>{viewers.length > 0 ? t('presence label', { count: viewers.length }) : t('share space')}</span>
          <Tooltip.Arrow />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};
