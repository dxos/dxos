//
// Copyright 2026 DXOS.org
//

import { type Database, Filter, Obj, Query, Tag } from '@dxos/echo';

import { Person } from '../../tutorial/schema.ts';

declare const db: Database.Database;
const ada = db.add(Obj.make(Person, { name: 'Ada' }));

// #region add
// Reuses a tag with this label if the space has one.
const speaker = await Tag.findOrCreate(db, { label: 'speaker', hue: 'amber' });

Obj.update(ada, (ada) => {
  Obj.addTag(ada, speaker);
});
// #endregion add

// #region query
const speakers = await db
  .query(Query.select(Filter.tag(Obj.getURI(speaker))))
  .run();
// #endregion query

// #region remove
Obj.update(ada, (ada) => {
  Obj.removeTag(ada, speaker);
});
// #endregion remove

export { speakers };
