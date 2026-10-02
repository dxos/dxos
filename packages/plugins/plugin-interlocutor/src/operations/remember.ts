//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref, Relation } from '@dxos/echo';
import { HasSubject } from '@dxos/types';

import { Memory, MemoryOperation } from '#types';

import { InterlocutorOperationError } from './errors.ts';

const handler: Operation.WithHandler<typeof MemoryOperation.Remember> = MemoryOperation.Remember.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ content, kind, origin, subjects, confidence, source, supersedes }) {
      if (subjects.length === 0) {
        return yield* Effect.fail(new InterlocutorOperationError({ message: 'A memory needs at least one subject.' }));
      }
      if (confidence !== undefined && (confidence < 0 || confidence > 1)) {
        return yield* Effect.fail(new InterlocutorOperationError({ message: 'Confidence must be between 0 and 1.' }));
      }

      const entities = yield* Effect.forEach(subjects, (subject) => Database.load(subject));
      const previous = supersedes ? yield* Database.load(supersedes) : undefined;

      const memory = yield* Database.add(
        Memory.make({
          content,
          kind,
          origin,
          ...(confidence !== undefined ? { confidence } : {}),
          ...(source ? { source } : {}),
          ...(previous ? { supersedes: Ref.make<Obj.Unknown>(previous) } : {}),
        }),
      );
      for (const entity of entities) {
        yield* Database.add(HasSubject.make({ [Relation.Source]: memory, [Relation.Target]: entity }));
      }

      // Never overwritten: the old claim stays readable as history.
      if (previous) {
        Obj.update(previous, (previous) => {
          previous.status = 'superseded';
        });
      }

      return { memory: Ref.make(memory) };
    }),
  ),
);

export default handler;
