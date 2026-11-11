//
// Copyright 2026 DXOS.org
//

import { type Database, Obj, Ref } from '@dxos/echo';

import { Event, Organization, Person } from './schema.ts';

// #region instance
/** An organization, a person who works there, and an event she attends. */
export const makeTeam = () => {
  const northwind = Obj.make(Organization, {
    name: 'Northwind Labs',
    website: 'https://northwind.example',
  });
  const ada = Obj.make(Person, {
    name: 'Ada Lovelace',
    employer: Ref.make(northwind),
  });
  const review = Obj.make(Event, {
    title: 'Quarterly review',
    attendees: [Ref.make(ada)],
  });
  return { northwind, ada, review };
};
// #endregion

/** Adds the records the app starts with: {@link makeTeam}'s, and more like them. */
export const seed = (db: Database.Database) => {
  const { northwind, ada, review } = makeTeam();
  db.add(northwind);
  db.add(ada);
  db.add(review);

  const halcyon = db.add(
    Obj.make(Organization, {
      name: 'Halcyon Robotics',
      website: 'https://halcyon.example',
    }),
  );
  const riverbend = db.add(Obj.make(Organization, { name: 'Riverbend Foods' }));
  const grace = db.add(
    Obj.make(Person, { name: 'Grace Hopper', employer: Ref.make(halcyon) }),
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

  Obj.update(review, (review) => {
    review.attendees = [
      ...(review.attendees ?? []),
      Ref.make(alan),
      Ref.make(grace),
    ];
  });
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
