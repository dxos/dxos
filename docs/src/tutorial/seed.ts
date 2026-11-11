//
// Copyright 2026 DXOS.org
//

import { type Database, Obj, Ref } from '@dxos/echo';

import { Event, Organization, Person } from './schema.ts';

/** Adds the records every embed starts with. */
export const seed = (db: Database.Database) => {
  const northwind = db.add(
    Obj.make(Organization, {
      name: 'Northwind Labs',
      website: 'https://northwind.example',
    }),
  );
  const halcyon = db.add(
    Obj.make(Organization, {
      name: 'Halcyon Robotics',
      website: 'https://halcyon.example',
    }),
  );
  const riverbend = db.add(Obj.make(Organization, { name: 'Riverbend Foods' }));

  const ada = db.add(
    Obj.make(Person, {
      name: 'Ada Lovelace',
      email: 'ada@northwind.example',
      employer: Ref.make(northwind),
    }),
  );
  const grace = db.add(
    Obj.make(Person, {
      name: 'Grace Hopper',
      email: 'grace@halcyon.example',
      employer: Ref.make(halcyon),
    }),
  );
  const alan = db.add(
    Obj.make(Person, { name: 'Alan Turing', employer: Ref.make(northwind) }),
  );
  const katherine = db.add(
    Obj.make(Person, {
      name: 'Katherine Johnson',
      employer: Ref.make(riverbend),
    }),
  );
  const edsger = db.add(Obj.make(Person, { name: 'Edsger Dijkstra' }));

  db.add(
    Obj.make(Event, {
      title: 'Quarterly review',
      description: 'Numbers, then lunch.',
      attendees: [Ref.make(ada), Ref.make(alan), Ref.make(grace)],
    }),
  );
  db.add(
    Obj.make(Event, {
      title: 'Robotics demo day',
      attendees: [Ref.make(grace), Ref.make(katherine)],
    }),
  );
  db.add(
    Obj.make(Event, {
      title: 'Reading group',
      description: 'Notes on structured programming.',
      attendees: [Ref.make(edsger), Ref.make(ada)],
    }),
  );
};
