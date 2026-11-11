//
// Copyright 2026 DXOS.org
//

import {
  Aggregate,
  type Database,
  Filter,
  Obj,
  Order,
  Query,
  Text,
} from '@dxos/echo';

import { Event } from '../../tutorial/schema.ts';

declare const db: Database.Database;
const launch = db.add(
  Obj.make(Event, { title: 'Launch', description: 'Agenda: ' }),
);

// #region text
Obj.update(launch, (launch) => {
  // replaces the whole string: a concurrent edit to the title loses
  launch.title = 'Product launch';
  // inserts characters: concurrent edits interleave
  Text.splice(launch, 'description', 8, 0, 'demo, questions. ');
});
// #endregion text

// #region history
const changes = Obj.getChanges(launch, { property: 'title' });
for (const { actor, time, before, after } of changes) {
  console.log(actor, time, before, '→', after);
}

// The event as it was after the first change.
const first = Obj.getVersion(launch, changes[0].heads);

// Changes per day across the space, newest first.
const perDay = await db
  .query(
    Query.select(Filter.changes())
      .aggregate({
        day: Aggregate.time('time', 'day'),
        changes: Aggregate.count(),
      })
      .orderBy(Order.property('day', 'desc')),
  )
  .run();
// #endregion history

// #region detect
const writers = new Set(changes.map((change) => change.actor));
if (writers.size > 1) {
  // Several devices set the title; show the history so a person can confirm
  // the result.
}
// #endregion detect

// #region branch
// A draft of the event and everything it references.
await db.createBranch(launch.id, 'draft');
await db.switchBranch(launch.id, 'draft');
Obj.update(launch, (launch) => {
  launch.title = 'Launch, moved to Friday';
});

// Back to main, then merge the draft into it.
await db.switchBranch(launch.id, 'main');
await db.mergeBranch(launch.id, 'draft', { deleteAfter: true });
// #endregion branch

// #region side-by-side
// A second live copy bound to the branch, without switching this device.
await db.createBranch(launch.id, 'proposal');
const proposal = await db.branch(launch, 'proposal');
Obj.update(proposal.object, (event) => {
  event.title = 'Launch, online only';
});
// launch.title is unchanged; show the two side by side.
proposal.dispose();
// #endregion side-by-side

export { first, perDay, writers };
