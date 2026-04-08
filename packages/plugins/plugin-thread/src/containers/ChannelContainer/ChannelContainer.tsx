//
// Copyright 2025 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';
import React, { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { useCapabilities, useCapability } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit';
import { Context } from '@dxos/context';
import { failUndefined } from '@dxos/debug';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { getSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Button, ElevationProvider, Input, Panel, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';
import { Menu, MenuRootProps, createMenuAction, createMenuItemGroup, useMenuActions } from '@dxos/react-ui-menu';
import { useSoundEffect } from '@dxos/react-ui-sfx';
import { composable, composableProps } from '@dxos/ui-theme';

import { Call } from '#components';
import { meta } from '#meta';
import { ThreadCapabilities } from '#types';
import { type Channel } from '#types';
import { ChatContainer } from '../ChatContainer';

export type ChannelContainerProps = AppSurface.AttendableObjectProps<
  Channel.Channel | undefined,
  {
    roomId?: string;
    fullscreen?: boolean;
  }
>;

/**
 * Renders a call when active, otherwise renders the channel chat.
 */
// TODO(burdon): Create Radix style layout.
export const ChannelContainer = ({
  role,
  subject: channel,
  attendableId,
  roomId: roomIdProp,
  fullscreen,
}: ChannelContainerProps) => {
  const space = getSpace(channel);
  const callManager = useCapability(ThreadCapabilities.CallManager);
  const extensions = useCapabilities(ThreadCapabilities.CallExtension);
  const joined = useAtomValue(callManager.joinedAtom);
  const currentRoomId = useAtomValue(callManager.roomIdAtom);
  const roomId = roomIdProp ?? attendableId ?? failUndefined();
  const identity = useIdentity();
  const isNamed = !!identity?.profile?.displayName;
  const joinSound = useSoundEffect('JoinCall');
  const leaveSound = useSoundEffect('LeaveCall');

  useEffect(() => {
    const ctx = new Context();
    callManager.left.on(ctx, (roomId) => {
      extensions.forEach((extension) => {
        void extension.onLeave?.(roomId);
      });
    });

    callManager.callStateUpdated.on(ctx, (state) => {
      extensions.forEach((extension) => {
        void extension.onCallStateUpdated?.(state);
      });
    });

    callManager.mediaStateUpdated.on(ctx, (state) => {
      extensions.forEach((extension) => {
        void extension.onMediaStateUpdated?.(state);
      });
    });

    return () => {
      void ctx.dispose();
    };
  }, [callManager, extensions]);

  /**
   * Join the call.
   */
  // TODO(wittjosiah): Show preview before joining?
  const handleJoin = useCallback(async () => {
    if (!roomId || !channel) {
      return;
    }

    if (joined) {
      await callManager.leave();
    }

    try {
      void joinSound.play();
      callManager.setRoomId(roomId);
      await callManager.join();
      await Promise.all(extensions.map((extension) => extension.onJoin?.({ channel, roomId })));
    } catch (err) {
      // TODO(burdon): Error sound.
      log.catch(err);
    }
  }, [extensions, channel, roomId, joined]);

  /**
   * Leave the call.
   */
  const handleLeave = useCallback(async () => {
    try {
      void leaveSound.play();
    } catch (err) {
      // TODO(burdon): Error sound.
      log.catch(err);
    } finally {
      void callManager.turnAudioOff();
      void callManager.turnVideoOff();
      void callManager.turnScreenshareOff();
      void callManager.leave();
    }
  }, [extensions, roomId]);

  const isJoined = joined && currentRoomId === roomId;
  if (isJoined) {
    return (
      <Panel.Root>
        <Panel.Content>
          {isNamed ? (
            <Call.Root>
              <Call.Grid fullscreen={fullscreen} />
              <Call.Toolbar channel={channel} onLeave={handleLeave} />
            </Call.Root>
          ) : (
            <DisplayNameMissing />
          )}
        </Panel.Content>
      </Panel.Root>
    );
  }

  if (channel && channel.defaultThread.target && space) {
    return (
      <Panel.Root classNames='dx-document'>
        <Panel.Toolbar asChild>
          <ChannelToolbar attendableId={attendableId} role={role} onJoinCall={handleJoin} />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <ChatContainer space={space} thread={channel.defaultThread.target} />
        </Panel.Content>
      </Panel.Root>
    );
  }

  return null;
};

const DisplayNameMissing = () => {
  const { t } = useTranslation(meta.id);
  const client = useClient();
  const [displayName, setDisplayName] = useState('');
  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setDisplayName(event.target.value), []);
  const handleSave = useCallback(() => client.halo.updateProfile({ displayName }), [client, displayName]);

  return (
    <div className='space-y-trim-md p-4 place-content-center'>
      <Settings.Item title={t('display-name.label')} description={t('display-name.description')}>
        <Input.TextInput
          value={displayName}
          onChange={handleChange}
          placeholder={t('display-name-input.placeholder')}
          classNames='md:min-w-64'
        />
      </Settings.Item>
      <Button classNames='md:col-span-2' disabled={!displayName} onClick={handleSave}>
        {t('set-display-name.label')}
      </Button>
    </div>
  );
};

const useChannelToolbarActions = (onJoinCall?: () => void) => {
  const creator = useMemo(
    () =>
      Atom.make(() => {
        return {
          nodes: [
            createMenuItemGroup('root', {
              label: ['channel-toolbar.title', { ns: meta.id }],
            }),
            createMenuAction('video-call', () => onJoinCall?.(), {
              label: ['start-video-call.menu', { ns: meta.id }],
              icon: 'ph--video-camera--regular',
              type: 'video-call',
            }),
          ],
          edges: [{ source: 'root', target: 'video-call', relation: 'child' }],
        };
      }),
    [],
  );

  return useMenuActions(creator);
};

type ChannelToolbarProps = Pick<MenuRootProps, 'attendableId'> & {
  onJoinCall?: () => void;
};

const ChannelToolbar = composable<HTMLDivElement, ChannelToolbarProps>(
  ({ attendableId, role, onJoinCall, ...props }, forwardedRef) => {
    const menuActions = useChannelToolbarActions(onJoinCall);

    return (
      <ElevationProvider elevation={role === 'section' ? 'positioned' : 'base'}>
        <Menu.Root {...menuActions} attendableId={attendableId}>
          <Menu.Toolbar {...composableProps(props)} ref={forwardedRef} />
        </Menu.Root>
      </ElevationProvider>
    );
  },
);
