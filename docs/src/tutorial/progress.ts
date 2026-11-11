//
// Copyright 2026 DXOS.org
//

import * as client from './client.ts';
import * as queries from './queries.ts';
import * as records from './records.ts';
import * as schema from './schema.ts';
import * as seed from './seed.ts';
import * as sharing from './sharing.ts';
import { todoStep } from './todo.ts';

/** How far the reader has built the app, in the order the learning path builds it. */
export type Stage = 'types' | 'queries' | 'records' | 'complete';

/** The pieces each stage needs, in learning-path order. */
const PIECES: readonly { stage: Stage; values: readonly unknown[] }[] = [
  {
    stage: 'types',
    values: [
      client.openSpace,
      schema.Organization,
      schema.Person,
      schema.Event,
      schema.types,
      seed.makeTeam,
      schema.employerName,
    ],
  },
  {
    stage: 'queries',
    values: [
      queries.organizations,
      queries.people,
      queries.events,
      queries.search,
      queries.employeesOf,
      queries.staffOf,
      queries.watchCount,
    ],
  },
  {
    stage: 'records',
    values: [
      records.addRecord,
      records.watchRecord,
      records.updateRecord,
      records.removeRecord,
    ],
  },
  { stage: 'complete', values: [sharing.createInvite, sharing.acceptInvite] },
];

export type Progress = {
  /** The last stage whose pieces are all written, if any. */
  stage?: Stage;
  /** The step that writes the next missing piece, if any. */
  next?: string;
};

/** Which stage the app's modules reach, and the next step to write. */
export const getProgress = (): Progress => {
  let stage: Stage | undefined;
  for (const piece of PIECES) {
    const next = piece.values.map(todoStep).find(Boolean);
    if (next) {
      return { stage, next };
    }
    stage = piece.stage;
  }
  return { stage };
};
