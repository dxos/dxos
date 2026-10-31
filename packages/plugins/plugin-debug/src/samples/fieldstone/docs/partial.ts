//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Ref } from '@dxos/echo';
import * as Architecture from '@dxos/plugin-canvas/Architecture';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import type * as Kanban from '@dxos/plugin-kanban/Kanban';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as Sheet from '@dxos/plugin-sheet/Sheet';

import { type Provides as TeamProvides } from '../team/index.ts';
import { type ArchitectureLinks, type InboxCrmLinks, type ProjectsLinks, makeDocuments } from './documents.ts';
import { type Drawings, makeDrawings } from './drawings.ts';
import { type Sheets, makeSheets } from './sheets.ts';

export type Provides = {
  readonly docs: Record<string, Markdown.Document>;
  readonly sheets: Sheets;
  readonly drawings: Drawings;
};

export type Requires = {
  readonly team: TeamProvides;
  readonly inboxCrm?: InboxCrmLinks;
  readonly projects?: ProjectsLinks;
  readonly architecture?: ArchitectureLinks;
};

/** Alien Labs' handbook, planning, incident, customer and meeting documents, with the sheets and drawings they embed. Spec: `CONTENT.md`. */
export const Partial: SampleSpace.Partial<Provides, Requires> = SampleSpace.partial('fieldstoneDocs', {
  schemas: [Markdown.Document, Sheet.Sheet, ...Architecture.canvasDrawingSchemas],
  run: ({ team, inboxCrm, projects, architecture }) =>
    Effect.gen(function* () {
      const sheets = yield* makeSheets();
      const drawings = yield* makeDrawings();
      const docs = yield* makeDocuments({ people: team.people, sheets, drawings, inboxCrm, projects, architecture });

      const refs = (...objects: Array<Markdown.Document | Sheet.Sheet | Drawing.Drawing | Kanban.Kanban | undefined>) =>
        objects.flatMap((object) => (object ? [Ref.make(object)] : []));
      yield* SampleSpace.collection(
        'Handbook',
        refs(
          docs.handbook,
          docs.onboarding,
          docs.runbook,
          docs.architecture,
          docs.decisions,
          drawings.orgChart,
          drawings.architectureDiagram,
          drawings.requestFlow,
          drawings.escalation,
        ),
      );
      yield* SampleSpace.collection(
        'Planning',
        refs(
          docs.roadmap,
          docs.hiring,
          docs.pricing,
          docs.vendors,
          drawings.roadmap,
          sheets.pricing,
          sheets.vendorSpend,
          sheets.cloudCost,
          sheets.hiring,
        ),
      );
      yield* SampleSpace.collection('Incidents', refs(docs.postmortem, sheets.incidentTimeline));
      if (inboxCrm) {
        yield* SampleSpace.collection(
          'Customers',
          refs(
            inboxCrm.pipeline.kanban,
            docs['customer.northpine'],
            docs['customer.meridian'],
            docs['customer.okapi'],
            docs['customer.brightwater'],
          ),
        );
      }
      yield* SampleSpace.collection('Meetings', refs(docs.syncNotes));

      return { docs, sheets, drawings };
    }),
});
