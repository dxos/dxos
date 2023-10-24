//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { Button } from '@dxos/react-ui';
import { Contact, DocumentStack, Message } from '@dxos/kai-types';
import { Stack, StackRow } from '@dxos/mosaic';
import { useConfig } from '@dxos/react-client';

import { AddressSection, CardProps } from '../../cards';
import { formatShortDate, sortMessage } from '../Message';
import { sectionActions, StackSection, CustomActionMenu } from '../Stack';

export const ContactStack = ({ space, object }: CardProps<Contact>) => {
  const config = useConfig();
  const name = object.name ?? object.email;
  const [stack, setStack] = useState<DocumentStack>();
  useEffect(() => {
    const { objects: stacks } = space.db.query(DocumentStack.filter());
    const stack = stacks.find((stack) => stack.subjectId === object.id);
    setStack(stack);
  }, [object]);

  const messages = useMemo(() => {
    const { objects: messages } = space.db.query(Message.filter());
    return messages.filter((message) => message.from.email === object.email).sort(sortMessage); // TODO(burdon): Check to also.
  }, [object]);
  const handleCreateStack = async () => {
    const stack = await space.db.add(new DocumentStack({ title: object.name, subjectId: object.id }));
    setStack(stack);
  };

  const now = new Date();

  return (
    <div className='flex flex-col w-full'>
      <StackRow slots={{ root: { className: 'py-4 border-b' } }}>
        <div className='text-2xl'>{name}</div>
      </StackRow>

      {(object.email !== name || object.username !== undefined) && (
        <StackRow slots={{ root: { className: 'py-4 border-b' } }}>
          <div className='flex flex-col text-sm'>
            {object.email && object.email !== name && <div className='text-sky-700'>{object.email}</div>}
            {object.username && <div className='text-sky-700'>{object.username}</div>}
            {object.phone && <div>{object.phone}</div>}
          </div>
        </StackRow>
      )}

      {object.address && (
        <StackRow slots={{ root: { className: 'py-4 border-b' } }}>
          <AddressSection address={object.address} />
        </StackRow>
      )}

      {/* TODO(burdon): Icon and Link. */}
      {object.employer && <StackRow slots={{ root: { className: 'py-4 border-b' } }}>{object.employer.name}</StackRow>}

      {messages.length > 0 && (
        <StackRow slots={{ root: { className: 'py-4' } }}>
          {messages.map((message) => (
            <div key={message.id} className='flex flex-col overflow-hidden items'>
              <div className='flex overflow-hidden items-center'>
                <div className='flex shrink-0 w-[80px] text-sm text-sky-700'>
                  {formatShortDate(now, new Date(message.date))}
                </div>
                <div className='truncate'>{message.subject}</div>
              </div>
            </div>
          ))}
        </StackRow>
      )}

      {stack && (
        <div>
          <Stack<DocumentStack.Section>
            slots={{
              section: {
                className: 'py-4',
              },
            }}
            sections={stack.sections}
            StackSection={StackSection}
            ContextMenu={({ section }) => (
              <CustomActionMenu actions={sectionActions(config, section)} stack={stack} section={section} />
            )}
          />
        </div>
      )}

      {!stack && (
        <StackRow slots={{ root: { className: 'py-4' } }}>
          <div>
            <Button variant='outline' onClick={() => handleCreateStack()}>
              Create Stack
            </Button>
          </div>
        </StackRow>
      )}
    </div>
  );
};
