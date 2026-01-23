//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { ArtifactId } from '@dxos/assistant';
import { Obj, Relation } from '@dxos/echo';
import { Database } from '@dxos/echo';
import { TracingService, defineFunction } from '@dxos/functions';
import { log } from '@dxos/log';
import { Markdown } from '@dxos/plugin-markdown/types';
import { HasSubject } from '@dxos/types';
import { trim } from '@dxos/util';

export default defineFunction({
  key: 'dxos.org/function/research/document-create',
  name: 'Create research document',
  description: 'Creates a note summarizing the research.',
  inputSchema: Schema.Struct({
    subject: ArtifactId.annotations({
      description: trim`
        ID of the object (organization, contact, etc.) for which the research was performed. 
      `,
    }),
    name: Schema.String.annotations({
      description: 'Name of the document.',
    }),
    content: Schema.String.annotations({
      description: trim`
        Content of the note. 
        Supports (and are prefered) references to research objects using @ syntax and <object> tags (refer to research blueprint instructions).
      `,
    }),
  }),
  outputSchema: Schema.Struct({
    document: ArtifactId.annotations({
      description: 'DXN of the created document.',
    }),
  }),
  handler: Effect.fnUntraced(function* ({ data: { subject, name, content } }) {
    log.info('Creating research document', { subject, name, content });

    // TODO(burdon): Auto flush before and after calling function?
    yield* Database.Service.flush({ indexes: true });
    yield* TracingService.emitStatus({ message: 'Creating research document...' });

    // TODO(burdon): Type check.
    const target = (yield* Database.Service.resolve(ArtifactId.toDXN(subject))) as Obj.Any;

    // Create document.
    const object = yield* Database.Service.add(
      Markdown.make({
        name,
        content,
      }),
    );

    // Create relation.
    yield* Database.Service.add(
      Relation.make(HasSubject.HasSubject, {
        [Relation.Source]: object,
        [Relation.Target]: target,
        completedAt: new Date().toISOString(),
      }),
    );

    yield* Database.Service.flush({ indexes: true });
    log.info('Created research document', { subject, object });

    return {
      document: Obj.getDXN(object).toString(),
    };
  }),
});
