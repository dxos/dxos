//
// Copyright 2023 DXOS.org
//

import { Circle } from '@phosphor-icons/react';
import React, { FC, ReactNode, useEffect, useMemo, useRef } from 'react';

import { Button } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';
import { Contact, Message, Organization } from '@dxos/kai-types';
import { Space, useQuery } from '@dxos/react-client/echo';

import { formatDate, getCompanyName, sortMessage } from './util';
import { ContactCard } from '../../cards';
import { useFrameRouter, useFrameContext, useFrameRegistry } from '../../hooks';

// TODO(burdon): Common container patter (see ContactFrame).
export const MessageFrame = () => {
  const selectedRef = useRef<HTMLDivElement>(null);
  const { space, frame, objectId } = useFrameContext();
  const router = useFrameRouter();

  // TODO(burdon): Add sort to filter.
  // TODO(burdon): Sort by source type.
  const messages = useQuery(space, Message.filter())
    .filter((message) => message.from.email)
    .sort(sortMessage);

  useEffect(() => {
    if (frame && messages.length && !objectId) {
      router({ space, frame, objectId: messages[0].id });
    }
  }, [frame]);

  const selected = objectId ? space?.db.getObjectById<Message>(objectId) : undefined;
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected]);

  const handleSelect = (message: Message) => {
    router({ space, frame, objectId: message.id });
  };

  const now = new Date();

  // TODO(burdon): Contact may not be available since currently a separate object.
  const getDisplayName = (contact?: Message.Recipient) => (contact?.name?.length ? contact?.name : contact?.email);

  // TODO(burdon): List/cursor.
  // TODO(burdon): Source selector (email, internal, etc.)
  // TODO(burdon): Internal messages in other frames.

  if (!space) {
    return null;
  }

  return (
    <div className='flex flex-1 overflow-hidden'>
      <div className='flex shrink-0 w-full md:w-[400px] overflow-hidden overflow-y-auto bg-white border-r'>
        <div className='flex flex-col w-full overflow-x-hidden'>
          {messages.length === 0 && <div className='flex w-full justify-center py-4 text-zinc-500'>No messages</div>}

          {messages.map((message) => {
            const { id, date: received, from, subject, body } = message;
            return (
              <div
                key={id}
                ref={message.id === selected?.id ? selectedRef : undefined}
                className='flex flex-col hover:bg-hover-bg cursor-pointer border-b py-2 pr-5'
                onClick={() => handleSelect(message)}
              >
                {/* From */}
                <Row
                  className='items-center'
                  gutter={
                    <Button variant='ghost'>
                      <Circle
                        weight={selected?.id === message.id ? 'fill' : 'regular'}
                        className={mx(getSize(4), 'text-zinc-300', selected?.id === message.id && 'text-sky-500')}
                      />
                    </Button>
                  }
                >
                  <div className='flex flex-1 text-sm text-teal-700'>{getDisplayName(from)}</div>
                  <div className='flex text-sm whitespace-nowrap text-right text-zinc-500 pl-2'>
                    {formatDate(now, new Date(received))}
                  </div>
                </Row>

                {/* Subject */}
                <Row>
                  <div className='truncate text-lg text-black pr-3'>{subject}</div>
                </Row>

                {/* Body */}
                <Row>
                  <div className='mt-1 truncate text-zinc-500'>{body?.slice(0, 60)}</div>
                </Row>
              </div>
            );
          })}
        </div>
      </div>

      <div className='hidden md:flex flex-1 flex-col overflow-hidden overflow-y-scroll py-4 pl-6 pr-16 bg-white'>
        {selected && <MessagePanel space={space} message={selected} />}
      </div>
    </div>
  );
};

const MessagePanel: FC<{ space: Space; message: Message }> = ({ space, message }) => {
  const router = useFrameRouter();
  const frameRegistry = useFrameRegistry();

  // TODO(burdon): Reuse in Calendar.
  const contact = useMemo(() => {
    let contact: Contact | undefined = message.from.contact;
    if (!contact) {
      // Look-up contact.
      // TODO(burdon): Extend query API.
      const query = space.db.query(Contact.filter());
      contact = query.objects.find((contact) => contact.email === message.from.email);

      // NOTE: Create provisional contact (non-persistent) until selected.
      if (!contact) {
        let employer;
        const name = getCompanyName(message.from.email);
        if (name) {
          employer = new Organization({ name });
        }

        contact = new Contact({ name: message.from.name, email: message.from.email, employer });
      }
    }

    return contact;
  }, [message]);

  const handleSelect = (contact: Contact) => {
    if (!message.from.contact) {
      setTimeout(async () => {
        contact = await space.db.add(contact);
        contact.tag = 'inbox';
        message.from.contact = contact; // TODO(burdon): Observer?
      });
    }
  };

  const handleNavigate = (contact: Contact) => {
    router({ space, frame: frameRegistry.getFrameDef('dxos.module.frame.contact'), objectId: contact.id });
  };

  return (
    <div className='flex flex-col space-y-4'>
      <ContactCard
        space={space}
        object={contact}
        temporary={!message.from.contact}
        onSelect={handleSelect}
        onAction={message.from.contact && handleNavigate}
      />

      <div className='flex px-2 ml-[46px] text-2xl'>{message.subject}</div>

      <div className='flex flex-col px-2 ml-[46px]'>
        {message.body?.split('\n').map((text, i) => (
          <div key={i} className='mb-2'>
            {text}
          </div>
        ))}
      </div>
    </div>
  );
};

// TODO(burdon): Factor out.
const Row: FC<{ children?: ReactNode; gutter?: ReactNode; className?: string; wide?: boolean }> = ({
  gutter,
  children,
  className,
  wide,
}) => {
  return (
    <div className={mx('flex overflow-hidden', className)}>
      <div className={mx('flex shrink-0', wide ? 'w-[48px]' : 'w-[40px]')}>{gutter}</div>
      <div className='flex w-full overflow-hidden'>{children}</div>
    </div>
  );
};

export default MessageFrame;
