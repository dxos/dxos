//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { type Database } from '@dxos/echo';
import { type Actor } from '@dxos/types';

import { useActorContact } from '#hooks';

import { Header } from '../Header';

export type EventAttendeeProps = {
  attendee: Actor.Actor;
  db?: Database.Database;
  onContactCreate?: (actor: Actor.Actor) => void;
};

export const EventAttendee = ({ attendee, db, onContactCreate }: EventAttendeeProps) => {
  const contactDXN = useActorContact(db, attendee);
  const handleContactCreate = useCallback(() => onContactCreate?.(attendee), [attendee]);

  return (
    <Header.Row
      icon={
        <Header.UserIconButton compact title={attendee.name} value={contactDXN} onContactCreate={handleContactCreate} />
      }
    >
      <h3 className='truncate'>{attendee.name || attendee.email}</h3>
    </Header.Row>
  );
};
