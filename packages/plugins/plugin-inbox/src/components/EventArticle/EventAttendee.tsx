//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { type Database } from '@dxos/react-client/echo';
import { type Actor } from '@dxos/types';

import { useActorContact } from '../../hooks';
import { UserIconButton } from '../common';

export type EventAttendeeProps = {
  attendee: Actor.Actor;
  db?: Database.Database;
  onContactCreate?: (actor: Actor.Actor) => void;
};

export const EventAttendee = ({ attendee, db, onContactCreate }: EventAttendeeProps) => {
  const contactDxn = useActorContact(db, attendee);
  const handleContactCreate = useCallback(() => onContactCreate?.(attendee), [attendee]);

  return (
    <div role='none' className='grid grid-cols-[2rem_1fr] gap-1 items-center'>
      <UserIconButton value={contactDxn.value} onContactCreate={handleContactCreate} />
      <h3 className='truncate text-primaryText'>{attendee.name || attendee.email}</h3>
    </div>
  );
};
