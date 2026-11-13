//
// Copyright 2026 DXOS.org
//

import { type Database, Obj, Ref, Relation } from '@dxos/echo';

import { Organization, Person } from '../../echo-tutorial/schema.ts';
import { WorksAt } from './works-at.ts';

declare const db: Database.Database;

// #region make
const acme = db.add(Obj.make(Organization, { name: 'Acme' }));
const ada = db.add(
  Obj.make(Person, {
    [Obj.Meta]: { keys: [{ source: 'crm.example.com', id: 'contact-42' }] },
    name: 'Ada',
    employer: Ref.make(acme),
  }),
);
// #endregion make

// #region managed
ada.id; // '01J…', unique and stable
Obj.getTypename(ada); // 'com.example.type.person'
Obj.getKeys(ada, 'crm.example.com'); // [{ source: 'crm.example.com', id: 'contact-42' }]
Obj.getLabel(ada); // 'Ada'
Obj.isDeleted(ada); // false
// #endregion managed

// #region relation
// The same fact as `employer`, as an entity of its own with a field of its own.
const job = db.add(
  Relation.make(WorksAt, {
    [Relation.Source]: ada,
    [Relation.Target]: acme,
    role: 'Engineer',
  }),
);
Relation.getSource(job); // ada
Relation.getTarget(job); // acme
// #endregion relation

// #region snapshot
const before = Obj.getSnapshot(ada); // an immutable copy
Obj.update(ada, (ada) => {
  ada.name = 'Ada Lovelace';
});
before.name; // still 'Ada'
ada.name; // 'Ada Lovelace'
// #endregion snapshot

// #region remove
db.remove(ada);
Obj.isDeleted(ada); // true
// #endregion remove
