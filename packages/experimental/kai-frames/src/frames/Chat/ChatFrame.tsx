//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useRef } from 'react';

import { Message } from '@dxos/kai-types';
import { useClient } from '@dxos/react-client';
import { useQuery } from '@dxos/react-client/echo';
import { humanize } from '@dxos/util';

import { ChatPanel } from './ChatPanel';
import { Video } from './Video';
import { useFrameContext, useFrameRouter, useFrameRegistry } from '../../hooks';
import { sortMessage } from '../Message';

export const ChatFrame = () => {
  const client = useClient();
  const frameRegistry = useFrameRegistry();
  const { space, frame, objectId } = useFrameContext();
  const router = useFrameRouter();
  const selectedRef = useRef<HTMLDivElement>(null);
  const messages = useQuery(space, Message.filter())
    .filter((message) => message.source?.resolver === 'dxos.module.frame.chat')
    .sort(sortMessage);
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelect = (message: Message) => {
    if (message.ref) {
      // TODO(burdon): Load frame.
      const [frame, objectId] = message.ref?.split('/') ?? [];
      if (frame) {
        router({ space, frame: frameRegistry.getFrameDef(frame), objectId });
      }
    }
  };

  const handleCreate = (text: string) => {
    const identity = client.halo.identity.get()!;
    const username = identity.profile?.displayName ?? humanize(identity.identityKey);
    if (text.length) {
      void space?.db.add(
        new Message({
          source: {
            resolver: 'dxos.module.frame.chat',
          },
          subject: text,
          date: new Date().toISOString(),
          from: new Message.Recipient({ name: username }),
          ref: `${frame?.module.id}/${objectId}`,
        }),
      );
    }
  };

  const handleDelete = (message: Message) => {
    space?.db.remove(message);
  };

  return (
    <div className='flex flex-1 flex-col overflow-hidden shadow-1'>
      <div className='flex shrink-0 overflow-hidden'> {space && <Video space={space} />} </div>
      <div className='flex flex-1 overflow-hidden'>
        <ChatPanel messages={messages} onSelect={handleSelect} onCreate={handleCreate} onDelete={handleDelete} />
      </div>
    </div>
  );
};

export default ChatFrame;
