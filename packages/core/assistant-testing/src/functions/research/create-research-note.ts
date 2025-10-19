//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Relation } from '@dxos/echo';
import { DatabaseService, TracingService, defineFunction } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { DXN, ObjectId } from '@dxos/keys';
import { log } from '@dxos/log';
import { Markdown } from '@dxos/plugin-markdown/types';

import { ResearchOn } from './research-graph';

export default defineFunction({
  key: 'dxos.org/function/create-research-note',
  name: 'Create research note',
  description: 'Creates a note summarizing the research.',
  inputSchema: Schema.Struct({
    // TODO(dmaretskyi): Use a specialized type for this (e.g. ArtifactId renamed as RefFromLLM)
    target: Schema.String.annotations({
      description: 'Id of the object (org, contact, etc.) for which the research was performed. This must be a ulid.',
    }),

    name: Schema.String.annotations({
      description: 'Name of the note.',
    }),

    content: Schema.String.annotations({
      description:
        'Content of the note. Supports (and are prefered) references to research objects using @ syntax and <object> tags (refer to research blueprint instructions).',
    }),
  }),
  outputSchema: Schema.Struct({}),
  handler: Effect.fnUntraced(function* ({ data: { target, name, content } }) {
    log.info('Creating research note', { target, name, content });

    yield* DatabaseService.flush({ indexes: true });
    yield* TracingService.emitStatus({ message: 'Creating research note...' });
    invariant(ObjectId.isValid(target));

    const targetObj = yield* DatabaseService.resolve(DXN.fromLocalObjectId(target));

    const doc = yield* DatabaseService.add(
      Markdown.makeDocument({
        name,
        content,
      }),
    );
    yield* DatabaseService.add(
      Relation.make(ResearchOn, {
        [Relation.Source]: doc,
        [Relation.Target]: targetObj as any,
        completedAt: new Date().toISOString(),
      }),
    );
    yield* DatabaseService.flush({ indexes: true });

    log.info('Created research note', { target, name, content });

    return {};
  }),
});
