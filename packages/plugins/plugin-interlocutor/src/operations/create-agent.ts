//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Agent from '@dxos/assistant/Agent';
import * as Operation from '@dxos/compute/Operation';
import { Ref } from '@dxos/echo';

import { InterlocutorSkill, InterviewSkill } from '#skills';
import { InterlocutorOperation } from '#types';

const handler: Operation.WithHandler<typeof InterlocutorOperation.CreateAgent> = InterlocutorOperation.CreateAgent.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, instructions }) {
      const agent = yield* Agent.makeInitialized(
        { name, instructions: instructions ?? '', skills: [Ref.make(InterviewSkill.make())] },
        InterlocutorSkill.make(),
      );
      return { agent: Ref.make(agent) };
    }),
  ),
);

export default handler;
