//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import React, { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { useCapabilities, useCapability } from '@dxos/app-framework';
import { Context } from '@dxos/context';
import { failUndefined } from '@dxos/debug';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { fullyQualifiedId, getSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { ElevationProvider, Input, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { ControlGroup, ControlGroupButton, ControlItemInput } from '@dxos/react-ui-form';
import { MenuProvider, ToolbarMenu, createMenuAction, createMenuItemGroup, useMenuActions } from '@dxos/react-ui-menu';
import { useSoundEffect } from '@dxos/react-ui-sfx';
import { StackItem } from '@dxos/react-ui-stack';

import { ThreadCapabilities } from '../capabilities';
import { meta } from '../meta';
import { type ChannelType } from '../types';

import { Call } from './Call';
import ChatContainer from './ChatContainer';

export type ChannelContainerProps = {
  channel?: ChannelType;
  roomId?: string;
  role?: string;
  fullscreen?: boolean;
};

/**
 * Renders a call when active, otherwise renders the channel chat.
 */
export const ChannelContainer = ({ channel, roomId: _roomId, role, fullscreen }: ChannelContainerProps) => {
  const space = getSpace(channel);
  const callManager = useCapability(ThreadCapabilities.CallManager);
  const roomId = _roomId ?? (channel ? fullyQualifiedId(channel) : failUndefined());
  const identity = useIdentity();
  const isNamed = !!identity?.profile?.displayName;
  const joinSound = useSoundEffect('JoinCall');
  const leaveSound = useSoundEffect('LeaveCall');

  const extensions = useCapabilities(ThreadCapabilities.CallExtension);
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

    if (callManager.joined) {
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
  }, [extensions, channel, roomId]);

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

  const isJoined = callManager.joined && callManager.roomId === roomId;

  return (
    <StackItem.Content classNames={isJoined && 'bs-full'} toolbar={!isJoined}>
      {isJoined && !isNamed && <DisplayNameMissing />}
      {isJoined && isNamed && (
        <Call.Root>
          <Call.Grid fullscreen={fullscreen} />
          <Call.Toolbar channel={channel} onLeave={handleLeave} />
        </Call.Root>
      )}
      {!isJoined && channel && channel.defaultThread.target && space && (
        <>
          <ChannelToolbar attendableId={fullyQualifiedId(channel)} role={role} onJoinCall={handleJoin} />
          <ChatContainer space={space} thread={channel.defaultThread.target} />
        </>
      )}
    </StackItem.Content>
  );
};

export default ChannelContainer;

const DisplayNameMissing = () => {
  const { t } = useTranslation(meta.id);
  const client = useClient();
  const [displayName, setDisplayName] = useState('');
  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setDisplayName(event.target.value), []);
  const handleSave = useCallback(() => client.halo.updateProfile({ displayName }), [client, displayName]);

  return (
    <ControlGroup classNames='p-4 place-content-center'>
      <ControlItemInput title={t('display name label')} description={t('display name description')}>
        <Input.TextInput
          value={displayName}
          onChange={handleChange}
          placeholder={t('display name input placeholder')}
          classNames='md:min-is-64'
        />
      </ControlItemInput>
      <ControlGroupButton disabled={!displayName} onClick={handleSave}>
        {t('set display name label')}
      </ControlGroupButton>
    </ControlGroup>
  );
};

const useChannelToolbarActions = (onJoinCall?: () => void) => {
  const creator = useMemo(
    () =>
      Rx.make(() => {
        return {
          nodes: [
            createMenuItemGroup('root', {
              label: ['channel toolbar title', { ns: meta.id }],
            }),
            createMenuAction('video-call', () => onJoinCall?.(), {
              label: ['start video call label', { ns: meta.id }],
              icon: 'ph--video-camera--regular',
              type: 'video-call',
            }),
          ],
          edges: [{ source: 'root', target: 'video-call' }],
        };
      }),
    [],
  );

  return useMenuActions(creator);
};

type ChannelToolbarProps = ThemedClassName<{
  attendableId?: string;
  role?: string;
  onJoinCall?: () => void;
}>;

const ChannelToolbar = ({ attendableId, role, onJoinCall, classNames }: ChannelToolbarProps) => {
  const menuProps = useChannelToolbarActions(onJoinCall);

  return (
    <ElevationProvider elevation={role === 'section' ? 'positioned' : 'base'}>
      <MenuProvider {...menuProps} attendableId={attendableId}>
        <ToolbarMenu classNames={classNames} />
      </MenuProvider>
    </ElevationProvider>
  );
};
