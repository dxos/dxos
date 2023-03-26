//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { Message } from '@dxos/kai-types';
import { useClient, useQuery } from '@dxos/react-client';
import { humanize } from '@dxos/util';

import { createPath, useAppRouter } from '../../hooks';
import { sortMessage } from '../Message';
import { ChatPanel } from './ChatPanel';
import { Video } from './Video';

export const ChatFrame = () => {
  const navigate = useNavigate();
  const client = useClient();
  const { space, frame, objectId } = useAppRouter();
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
        navigate(createPath({ spaceKey: space?.key, frame, objectId }));
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
            resolver: 'dxos.module.frame.chat'
          },
          subject: text,
          date: new Date().toISOString(),
          from: new Message.Recipient({ name: username }),
          ref: `${frame?.module.id}/${objectId}`
        })
      );
    }
  };

  const handleDelete = (message: Message) => {
    space?.db.remove(message);
  };

  return (
    <div>
      {space && <Video space={space} />}
      <ChatPanel messages={messages} onSelect={handleSelect} onCreate={handleCreate} onDelete={handleDelete} />;
    </div>
  );
};

export default ChatFrame;
