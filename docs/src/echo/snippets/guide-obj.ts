//
// Copyright 2026 DXOS.org
//

import { type Database, Obj, Ref, Tag } from '@dxos/echo';

import { Organization, Person } from '../../echo-tutorial/schema.ts';

declare const db: Database.Database;
const acme = db.add(Obj.make(Organization, { name: 'Acme' }));

// #region make
const ada = Obj.make(Person, {
  [Obj.Meta]: { keys: [{ source: 'crm.example.com', id: 'contact-42' }] },
  name: 'Ada',
  employer: Ref.make(acme),
});
db.add(ada);
// #endregion make

// #region update
const name = ada.name; // read a field directly

Obj.update(ada, (ada) => {
  ada.email = 'ada@example.com';
});

const before = Obj.getSnapshot(ada); // an immutable copy
Obj.update(ada, (ada) => {
  ada.name = 'Ada Lovelace';
});
// before.name is still 'Ada'
// #endregion update

// #region subscribe
const unsubscribe = Obj.subscribe(ada, () => {
  console.log('changed', ada.name);
});
unsubscribe();
// #endregion subscribe

// #region meta
const [crm] = Obj.getKeys(ada, 'crm.example.com');

const speaker = db.add(Tag.make({ label: 'speaker' }));
Obj.update(ada, (ada) => {
  Obj.addTag(ada, speaker);
});
// #endregion meta

// #region history
const changes = Obj.getChanges(ada, { property: 'name' });
const [last] = changes.slice(-1);
last.actor; // the device that made the change
last.before; // 'Ada'
last.after; // 'Ada Lovelace'

// The object as it was after a change, without touching the live object.
const then = Obj.getVersion(ada, changes[0].heads);
// #endregion history

// #region json
const copy = Obj.clone(ada);
const json = Obj.toJSON(ada);
// #endregion json

export { before, copy, crm, json, name, then };
