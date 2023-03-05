//
// Copyright 2023 DXOS.org
//

import format from 'date-fns/format';
import formatDistance from 'date-fns/formatDistance';
import isToday from 'date-fns/isToday';
import { Circle, UserCircle } from 'phosphor-react';
import React, { FC, ReactNode, useState } from 'react';

import { Message } from '@dxos/kai-types';
import { useQuery } from '@dxos/react-client';
import { Button, getSize, mx } from '@dxos/react-components';

import { useAppRouter } from '../../hooks';

export const MessageFrame = () => {
  const { space } = useAppRouter();
  // TODO(burdon): Add sort to filter.
  const messages = useQuery(space, Message.filter()).sort(({ date: a }, { date: b }) => (a < b ? 1 : a > b ? -1 : 0));

  const [selected, setSelected] = useState<Message>(messages[0]);

  const now = Date.now();
  const date = (date: Date) =>
    isToday(date) ? format(date, 'hh:mm aaa') : formatDistance(date, now, { addSuffix: true });

  // TODO(burdon): Contact may not be available since currently a separate object.
  const getDisplayName = (contact?: Message.Contact) => (contact?.name?.length ? contact?.name : contact?.email);

  // TODO(burdon): List/cursor.
  return (
    <div className='flex flex-1 overflow-hidden'>
      <div className='flex shrink-0 w-full md:w-[400px] overflow-hidden overflow-y-auto bg-white border-r'>
        <div className='flex flex-col overflow-x-hidden'>
          {messages.map((message) => {
            const { id, date: received, from, subject, body } = message;

            return (
              <div
                key={id}
                className='flex flex-col hover:bg-hover-bg cursor-pointer border-b py-2 pr-5'
                onClick={() => setSelected(message)}
              >
                {/* From */}
                <Row
                  className='items-center'
                  gutter={
                    <Button variant='ghost'>
                      <Circle
                        weight={selected?.id === message.id ? 'fill' : 'regular'}
                        className={mx(getSize(5), 'text-zinc-300', selected?.id === message.id && 'text-sky-500')}
                      />
                    </Button>
                  }
                >
                  <div className='flex flex-1 text-sm text-teal-700'>{getDisplayName(from)}</div>
                  <div className='flex text-sm whitespace-nowrap text-right text-zinc-500 pl-2'>
                    {date(new Date(received))}
                  </div>
                </Row>

                {/* Subject */}
                <Row>
                  <div className='overflow-hidden text-ellipsis whitespace-nowrap text-lg text-black pr-3'>
                    {subject}
                  </div>
                </Row>

                {/* Body */}
                <Row>
                  <div className='mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-zinc-500'>
                    {body.slice(0, 60)}
                  </div>
                </Row>
              </div>
            );
          })}
        </div>
      </div>

      <div className='hidden md:flex flex-1 flex-col overflow-hidden overflow-y-scroll py-4 pl-6 pr-16 bg-white'>
        {selected && (
          <div className='flex flex-col '>
            <Row
              wide
              className='pb-4 items-center'
              gutter={
                <Button variant='ghost' className='p-1'>
                  <UserCircle weight='duotone' className={mx(getSize(8), 'text-sky-300')} />
                </Button>
              }
            >
              {/* TODO(burdon): Contact create/link. */}
              <div>{getDisplayName(selected.from)}</div>
            </Row>

            <Row wide className='pb-4'>
              <div className='text-2xl'>{selected.subject}</div>
            </Row>

            <Row wide>
              <div className='flex flex-col'>
                {selected.body?.split('\n').map((text, i) => (
                  <div key={i}>{text}</div>
                ))}
              </div>
            </Row>
          </div>
        )}
      </div>
    </div>
  );
};

const Row: FC<{ children?: ReactNode; gutter?: ReactNode; className?: string; wide?: boolean }> = ({
  gutter,
  children,
  className,
  wide
}) => {
  return (
    <div className={mx('flex overflow-hidden', className)}>
      <div className={mx('flex shrink-0', wide ? 'w-[48px]' : 'w-[40px]')}>{gutter}</div>
      <div className='flex w-full overflow-hidden'>{children}</div>
    </div>
  );
};

export default MessageFrame;
