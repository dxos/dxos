//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { ArtifactId } from '@dxos/assistant';
import { Obj, Relation } from '@dxos/echo';
import { DatabaseService, TracingService, defineFunction } from '@dxos/functions';
import { log } from '@dxos/log';
import { Markdown } from '@dxos/plugin-markdown/types';
import { DataType } from '@dxos/schema';
import { trim } from '@dxos/util';

export default defineFunction({
  key: 'dxos.org/function/research/create-document',
  name: 'Create research document',
  description: 'Creates a note summarizing the research.',
  inputSchema: Schema.Struct({
    name: Schema.String.annotations({
      description: 'Name of the note.',
    }),

    content: Schema.String.annotations({
      description: trim`
        Content of the note. 
        Supports (and are prefered) references to research objects using @ syntax and <object> tags (refer to research blueprint instructions).
      `,
    }),

    target: ArtifactId.annotations({
      description: trim`
        Id of the object (organization, contact, etc.) for which the research was performed. 
      `,
    }),
  }),
  outputSchema: Schema.Struct({
    researchDocument: ArtifactId,
  }),
  handler: Effect.fnUntraced(function* ({ data: { target, name, content } }) {
    log.info('Creating research document', { target, name, content });

    yield* DatabaseService.flush({ indexes: true });
    yield* TracingService.emitStatus({ message: 'Creating research document...' });
    const targetObj = yield* DatabaseService.resolve(ArtifactId.toDXN(target));

    const doc = yield* DatabaseService.add(
      Markdown.makeDocument({
        name,
        content,
      }),
    );
    yield* DatabaseService.add(
      Relation.make(DataType.HasSubject, {
        [Relation.Source]: doc,
        [Relation.Target]: targetObj as any,
        completedAt: new Date().toISOString(),
      }),
    );
    yield* DatabaseService.flush({ indexes: true });

    log.info('Created research document', { target, name, content });
    return { researchDocument: Obj.getDXN(doc).toString() };
  }),
});
