//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Ref } from '@dxos/echo';

import ABOUT_MD from './ABOUT.md?raw';
import { Schedule } from './calendar.ts';
import { ContactsViews } from './contacts-views.ts';
import { Docs } from './docs.ts';
import { Drawings } from './drawings.ts';
import { Inbox } from './mailbox.ts';
import { Notes } from './notes.ts';
import { Organizations, type OrgMap } from './organizations.ts';
import { People, type PersonMap } from './people.ts';
import { Projects, type ProjectsResult } from './projects.ts';
import TOUR_MD from './README.md?raw';
import { RoastLogs } from './roast-log.ts';
import { Sheets } from './sheets.ts';
import { TaskSets, type TaskSetsResult } from './tasks.ts';

export type Provides = {
  readonly organizations: OrgMap;
  readonly people: PersonMap;
  readonly taskSets: TaskSetsResult;
  readonly projects: ProjectsResult;
};

/**
 * Bramble Coffee Roasters, mid-launch. Spec: `CONTENT.md`.
 *
 * All generated content must agree with `ABOUT.md` beside it, the canonical reference for every
 * Bramble world-fact; update it when the world changes.
 */
export const Partial: SampleSpace.Partial<Provides> = SampleSpace.partial('bramble', {
  partials: {
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
  },
  run: (_: void, partials) =>
    Effect.gen(function* () {
      const docs = yield* partials.docs({ tourMd: TOUR_MD, aboutMd: ABOUT_MD });
      // The root only ever holds collections, so every collection-item object belongs to a themed
      // collection or a project rather than sitting loose on the root.
      yield* SampleSpace.collection('Welcome', [Ref.make(docs.tour), Ref.make(docs.about)]);

      // Contacts - organizations, people and the views over them live directly in the space DB.
      // They are not collection-item types; the database viewer surfaces them.
      const organizations = yield* partials.organizations();
      const people = yield* partials.people(organizations);
      yield* partials.contactsViews();

      const { mailbox } = yield* partials.inbox(people);
      yield* partials.schedule({ people, organizations });
      const taskSets = yield* partials.taskSets(people);

      const notes = yield* partials.notes({ people, organizations, taskSet: taskSets.springBlend.taskSet });
      const drawings = yield* partials.drawings();
      const sheets = yield* partials.sheets();
      yield* partials.roastLogs(people);

      // A collection and a project can both hold an object; the first to reference it owns it, and
      // deleting the owner deletes the object. Reference is filled before the projects so it owns
      // the company records they list as artifacts; the handbook is filled after, so it only points
      // at documents the projects own.
      yield* SampleSpace.collection('Reference', [
        Ref.make(notes.wholesaleTerms),
        Ref.make(notes.cuppingNotes),
        Ref.make(sheets.greenInventory),
        Ref.make(sheets.priceList),
        Ref.make(sheets.salesReport),
      ]);
      const projects = yield* partials.projects({
        taskSets,
        notes,
        drawings,
        about: docs.about,
        mailbox,
        organizations,
      });
      yield* SampleSpace.collection('Roastery Handbook', [
        Ref.make(drawings.floorPlan),
        Ref.make(notes.tastingProtocol),
      ]);

      return { organizations, people, taskSets, projects };
    }),
});
