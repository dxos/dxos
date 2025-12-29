//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import React, { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { useCapabilities, useCapability } from '@dxos/app-framework/react';
import { Context } from '@dxos/context';
import { failUndefined } from '@dxos/debug';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { getSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { ElevationProvider, Input, useTranslation } from '@dxos/react-ui';
import { ControlGroup, ControlGroupButton, ControlItemInput } from '@dxos/react-ui-form';
import { MenuProvider, ToolbarMenu, createMenuAction, createMenuItemGroup, useMenuActions } from '@dxos/react-ui-menu';
import { useSoundEffect } from '@dxos/react-ui-sfx';
import { StackItem } from '@dxos/react-ui-stack';

import { ThreadCapabilities } from '../types';
import { meta } from '../meta';
import { type Channel } from '../types';

import { Call } from './Call';
import ChatContainer from './ChatContainer';

// TODO(burdon): Create Radix style layout.

export type ChannelContainerProps = {
  channel?: Channel.Channel;
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
  const attendableId = channel ? Obj.getDXN(channel).toString() : undefined;
  const roomId = _roomId ?? attendableId ?? failUndefined();
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
          <ChannelToolbar attendableId={attendableId} role={role} onJoinCall={handleJoin} />
          <ChatContainer space={space} thread={channel.defaultThread.target} classNames='container-max-width' />
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
      Atom.make(() => {
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

type ChannelToolbarProps = {
  attendableId?: string;
  role?: string;
  onJoinCall?: () => void;
};

const ChannelToolbar = ({ attendableId, role, onJoinCall }: ChannelToolbarProps) => {
  const menuProps = useChannelToolbarActions(onJoinCall);

  return (
    <ElevationProvider elevation={role === 'section' ? 'positioned' : 'base'}>
      <MenuProvider {...menuProps} attendableId={attendableId}>
        <ToolbarMenu textBlockWidth />
      </MenuProvider>
    </ElevationProvider>
  );
};
