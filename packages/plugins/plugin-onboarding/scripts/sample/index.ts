//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Ref } from '@dxos/echo';

import { Schedule } from './calendar';
import { ContactsViews } from './contacts-views';
import { Docs, type DocsContent } from './docs';
import { Drawings } from './drawings';
import { Inbox } from './mailbox';
import { Notes } from './notes';
import { Organizations } from './organizations';
import { People } from './people';
import { RoastLogs } from './roast-log';
import { Sheets } from './sheets';
import { SpringBlend } from './tasks';
import { REFERENCE } from './util';

/**
 * The Bramble Coffee Roasters sample space — the content every new identity gets on first launch.
 *
 * Content is grounded in `src/content/sample/ABOUT.md`, the canonical reference for all Bramble
 * world-facts (company history, team, suppliers, customers, active initiatives, email conventions,
 * map coordinates). When extending a phase, read it first and update it if the world changes; all
 * generated content must agree with the facts and tone described there.
 */
const phases = {
  docs: Docs,
  organizations: Organizations,
  people: People,
  contactsViews: ContactsViews,
  inbox: Inbox,
  schedule: Schedule,
  springBlend: SpringBlend,
  notes: Notes,
  drawings: Drawings,
  sheets: Sheets,
  roastLogs: RoastLogs,
};

export const BrambleSpace = (content: DocsContent): SampleSpace.Definition<typeof phases, void> =>
  SampleSpace.make({
    space: { name: 'Bramble Coffee Roasters', icon: 'potted-plant', hue: 'amber' },
    reference: REFERENCE,
    phases,
    build: (phases) =>
      Effect.gen(function* () {
        const docs = yield* phases.docs(content);

        // Contacts — organizations, people and the views over them live directly in the space DB.
        // They are not collection-item types; the database viewer surfaces them.
        const organizations = yield* phases.organizations();
        const people = yield* phases.people(organizations);
        yield* phases.contactsViews();

        yield* phases.inbox(people);
        yield* phases.schedule({ people, organizations });
        const { taskSet } = yield* phases.springBlend(people);

        const notes = yield* phases.notes({ people, organizations, taskSet });
        const drawings = yield* phases.drawings();
        const sheets = yield* phases.sheets();
        yield* phases.roastLogs(people);

        // The root only ever holds collections, so every collection-item object (documents,
        // drawings, sheets) is grouped into a themed collection rather than left loose on the root.
        yield* SampleSpace.collection('Welcome', [Ref.make(docs.tour), Ref.make(docs.about)]);
        yield* SampleSpace.collection('Spring Blend Launch', [
          Ref.make(notes.tastingProtocol),
          Ref.make(drawings.flavorWheel),
        ]);
        yield* SampleSpace.collection('Roastery Notes', [
          Ref.make(notes.cuppingNotes),
          Ref.make(notes.itinerary),
          Ref.make(drawings.floorPlan),
          Ref.make(sheets.greenInventory),
          Ref.make(sheets.priceList),
        ]);
      }),
  });
