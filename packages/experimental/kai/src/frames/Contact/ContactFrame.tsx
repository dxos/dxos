//
// Copyright 2023 DXOS.org
//

import React, { FC, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Contact, DocumentStack } from '@dxos/kai-types';
import { useQuery } from '@dxos/react-client';
import { Button } from '@dxos/react-components';

import { createPath, useAppRouter } from '../../hooks';
import { ContactCard } from './ContactCard';

const stringSort = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const sort = ({ name: a1, email: a2 }: Contact, { name: b1, email: b2 }: Contact) => stringSort(a1 ?? a2, b1 ?? b2);

// TODO(burdon): Colored tags.
// TODO(burdon): Recent messages.
// TODO(burdon): Tasks.
export const ContactFrame = () => {
  const navigate = useNavigate();
  const { space, frame, objectId } = useAppRouter();
  const contacts = useQuery(space, Contact.filter()).sort(sort);
  const selected = objectId ? space?.db.getObjectById<Contact>(objectId) : undefined;
  const selectedRef = useRef<HTMLDivElement>(null);

  const findStack = (contact: Contact) => {
    const { objects: stacks } = space!.db.query(DocumentStack.filter());
    return stacks.find((stack) => stack.subjectId === contact.id);
  };

  const [stack, setStack] = useState<DocumentStack>();
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (selected) {
      setStack(findStack(selected));
    } else {
      setStack(undefined);
    }
  }, [selected]);

  const handleSelect = (contact: Contact) => {
    navigate(createPath({ spaceKey: space?.key, frame: frame!.module.id, objectId: contact.id }));
  };

  const handleCreateStack = async (contact: Contact) => {
    const stack = await space!.db.add(new DocumentStack({ title: contact.name, subjectId: contact.id }));
    // setStack(stack);
    navigate(createPath({ spaceKey: space?.key, frame: 'dxos.module.frame.stack', objectId: stack.id }));
  };

  // TODO(burdon): Factor out.
  const CardList: FC<{
    className?: string;
    objects: Contact[];
    selected?: Contact;
    onSelect: (selected: Contact) => void;
  }> = ({ className, objects, selected, onSelect }) => (
    <div className={className}>
      {objects.map((object) => (
        <div key={object.id} ref={object.id === selected?.id ? selectedRef : undefined} className='flex mb-2 md:mr-2'>
          {/* TODO(burdon): Generalize cards. */}
          <ContactCard object={object} selected={object.id === selected?.id} onSelect={onSelect} />
        </div>
      ))}
    </div>
  );

  // Column.
  if (selected) {
    return (
      <div className='flex flex-1 overflow-hidden mt-2 md:mx-2'>
        <div className='flex flex-col shrink-0 overflow-y-scroll'>
          <CardList objects={contacts} selected={selected} onSelect={handleSelect} />
          {/* Allow scrolling to top of last item. */}
          <div className='flex flex-col mb-[100vh]' />
        </div>
        <div className='flex flex-col flex-1 bg-white'>
          <div className='flex p-4'>
            {!stack && (
              <Button variant='primary' onClick={() => handleCreateStack(selected)}>
                Create Stack
              </Button>
            )}

            {stack && <div>{stack.__typename}</div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-1 overflow-x-scroll mt-2 md:mx-2'>
      <CardList className='flex flex-col flex-wrap' objects={contacts} selected={selected} onSelect={handleSelect} />
    </div>
  );
};
