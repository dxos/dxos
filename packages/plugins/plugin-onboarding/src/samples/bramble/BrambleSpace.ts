//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Ref } from '@dxos/echo';

import { BRAMBLE_TEMPLATE_ID } from '../../constants.ts';
import ABOUT_MD from './ABOUT.md?raw';
import { Schedule } from './calendar.ts';
import { ContactsViews } from './contacts-views.ts';
import { Docs } from './docs.ts';
import { Drawings } from './drawings.ts';
import { Inbox } from './mailbox.ts';
import { Notes } from './notes.ts';
import { Organizations } from './organizations.ts';
import { People } from './people.ts';
import { Projects } from './projects.ts';
import TOUR_MD from './README.md?raw';
import { RoastLogs } from './roast-log.ts';
import { Sheets } from './sheets.ts';
import { TaskSets } from './tasks.ts';
import { REFERENCE } from './util.ts';

/**
 * The Bramble Coffee Roasters space template — the content every new identity gets on first launch,
 * and the template anyone can pick again from the create-space dialog.
 *
 * All generated content must agree with `ABOUT.md` beside it, the canonical reference for every
 * Bramble world-fact; update it when the world changes.
 */
const phases = {
  docs: Docs,
  organizations: Organizations,
  people: People,
  contactsViews: ContactsViews,
  inbox: Inbox,
  schedule: Schedule,
  taskSets: TaskSets,
  notes: Notes,
  drawings: Drawings,
  sheets: Sheets,
  roastLogs: RoastLogs,
  projects: Projects,
};

export const make = (): SampleSpace.Definition<typeof phases, void> =>
  SampleSpace.make({
    space: { name: 'Bramble Coffee Roasters', icon: 'potted-plant', hue: 'amber' },
    reference: REFERENCE,
    phases,
    build: (phases) =>
      Effect.gen(function* () {
        const docs = yield* phases.docs({ tourMd: TOUR_MD, aboutMd: ABOUT_MD });
        // The root only ever holds collections, so every collection-item object belongs to a themed
        // collection or a project rather than sitting loose on the root.
        yield* SampleSpace.collection('Welcome', [Ref.make(docs.tour), Ref.make(docs.about)]);

        // Contacts — organizations, people and the views over them live directly in the space DB.
        // They are not collection-item types; the database viewer surfaces them.
        const organizations = yield* phases.organizations();
        const people = yield* phases.people(organizations);
        yield* phases.contactsViews();

        const { mailbox } = yield* phases.inbox(people);
        yield* phases.schedule({ people, organizations });
        const taskSets = yield* phases.taskSets(people);

        const notes = yield* phases.notes({ people, organizations, taskSet: taskSets.springBlend.taskSet });
        const drawings = yield* phases.drawings();
        const sheets = yield* phases.sheets();
        yield* phases.roastLogs(people);

        // A collection and a project can both hold an object; the first to reference it owns it, and
        // deleting the owner deletes the object. Reference is filled before the projects so it owns
        // the company records they list as artifacts; the handbook is filled after, so it only points
        // at documents the projects own.
        yield* SampleSpace.collection('Reference', [
          Ref.make(notes.wholesaleTerms),
          Ref.make(notes.cuppingNotes),
          Ref.make(sheets.greenInventory),
          Ref.make(sheets.priceList),
        ]);
        yield* phases.projects({ taskSets, notes, drawings, about: docs.about, mailbox, organizations });
        yield* SampleSpace.collection('Roastery Handbook', [
          Ref.make(drawings.floorPlan),
          Ref.make(notes.tastingProtocol),
        ]);
      }),
  });

export const makeTemplate = (): AppCapabilities.SpaceTemplate =>
  SampleSpace.makeTemplate({
    id: BRAMBLE_TEMPLATE_ID,
    description: 'A coffee roastery mid-launch: four projects, plus its people, mail, calendar, notes and roast logs.',
    definition: make(),
  });
