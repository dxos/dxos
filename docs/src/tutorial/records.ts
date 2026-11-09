//
// Copyright 2026 DXOS.org
//

import { type Database, Obj, Ref } from '@dxos/echo';

import { Event, Organization, Person } from './schema.ts';

// #region add
export const addOrganization = (db: Database.Database, props: { name: string; website?: string }) =>
  db.add(Obj.make(Organization, props));

export const addPerson = (
  db: Database.Database,
  { employer, ...props }: { name: string; email?: string; employer?: Organization },
) => db.add(Obj.make(Person, { ...props, ...(employer && { employer: Ref.make(employer) }) }));

export const addEvent = (
  db: Database.Database,
  { attendees = [], ...props }: { title: string; description?: string; attendees?: Person[] },
) => db.add(Obj.make(Event, { ...props, attendees: attendees.map((person) => Ref.make(person)) }));
// #endregion

// #region update
/** Moves a person to another organization. */
export const changeEmployer = (person: Person, employer: Organization) =>
  Obj.update(person, (person) => {
    person.employer = Ref.make(employer);
  });

/** Writes the values a form returns onto a record, one field at a time. */
export const updateRecord = (record: Obj.Unknown, values: Record<string, unknown>) =>
  Obj.update(record, (record) => {
    for (const [key, value] of Object.entries(values)) {
      Obj.setValue(record, [key], value);
    }
  });
// #endregion

// #region remove
export const removeRecord = (db: Database.Database, record: Obj.Unknown) => db.remove(record);
// #endregion

// #region seed
/** The records every embed starts with. */
export const seed = (db: Database.Database) => {
  const northwind = addOrganization(db, { name: 'Northwind Labs', website: 'https://northwind.example' });
  const halcyon = addOrganization(db, { name: 'Halcyon Robotics', website: 'https://halcyon.example' });
  const riverbend = addOrganization(db, { name: 'Riverbend Foods' });

  const ada = addPerson(db, { name: 'Ada Lovelace', email: 'ada@northwind.example', employer: northwind });
  const grace = addPerson(db, { name: 'Grace Hopper', email: 'grace@halcyon.example', employer: halcyon });
  const alan = addPerson(db, { name: 'Alan Turing', employer: northwind });
  const katherine = addPerson(db, { name: 'Katherine Johnson', employer: riverbend });
  const edsger = addPerson(db, { name: 'Edsger Dijkstra' });

  addEvent(db, { title: 'Quarterly review', description: 'Numbers, then lunch.', attendees: [ada, alan, grace] });
  addEvent(db, { title: 'Robotics demo day', attendees: [grace, katherine] });
  addEvent(db, { title: 'Reading group', description: 'Notes on structured programming.', attendees: [edsger, ada] });
};
// #endregion
