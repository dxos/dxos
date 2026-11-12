//
// Copyright 2026 DXOS.org
//

import { type Database, Obj, Text } from '@dxos/echo';

import { Event } from '../../tutorial/schema.ts';

declare const db: Database.Database;
const launch = db.add(
  Obj.make(Event, { title: 'Launch', description: 'Agenda: demo.' }),
);

// #region edit
Obj.update(launch, (launch) => {
  // Insert at a character index, as Array.prototype.splice does.
  Text.splice(launch, 'description', 8, 0, 'welcome, ');

  // Replace the whole value with a minimal diff of characters.
  Text.update(launch, 'description', 'Agenda: welcome, demo, questions.');

  // Find and replace.
  Text.apply(launch, 'description', [
    { oldString: 'questions', newString: 'Q&A' },
  ]);
});
// #endregion edit

export { launch };
