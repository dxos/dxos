//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Ref } from '@dxos/echo';

import { Docs } from './docs';
import { ProjectPhase } from './project';
import { Tasks } from './tasks';
import { REFERENCE } from './util';

const phases = {
  docs: Docs,
  tasks: Tasks,
  project: ProjectPhase,
};

/**
 * An outage retrospective to delegate: a status log, four people's notes, and the four tasks that turn
 * them into a filed retro with owned action items and a customer notice.
 *
 * Engineering in setting, not in kind. The technical cause is a certificate that expired, and the log
 * states it outright; nothing here needs code read or written. The work is in the notes — a page sent
 * to someone who left the team, a renewal reminder on a departed colleague's calendar, a support lead
 * guessing who to call — and in holding them against the log, which contradicts two of them. That is
 * the evaluation: does the retro recommend what the evidence supports, or what the loudest note says.
 */
export const IncidentSpace = (): SampleSpace.Definition<typeof phases, void> =>
  SampleSpace.make({
    space: { name: 'Incident 0516 retrospective', icon: 'stethoscope', hue: 'rose' },
    reference: REFERENCE,
    phases,
    build: (phases) =>
      Effect.gen(function* () {
        const docs = yield* phases.docs();
        const tasks = yield* phases.tasks();
        yield* phases.project({ docs, tasks });

        // The root holds collections only; the project and its tasks surface through their own containers.
        yield* SampleSpace.collection('Sources', [
          Ref.make(docs.log),
          Ref.make(docs.notes.jae),
          Ref.make(docs.notes.priya),
          Ref.make(docs.notes.dan),
          Ref.make(docs.notes.sam),
        ]);
      }),
  });
