//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Obj, Relation } from '@dxos/echo';
import { TracingService } from '@dxos/functions';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';
import { Markdown } from '@dxos/plugin-markdown/types';
import { HasSubject } from '@dxos/types';

import { DocumentCreate } from './definitions';

export default DocumentCreate.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ subject, name, content }) {
      log.info('Creating research document', { subject, name, content });

      // TODO(burdon): Auto flush before and after calling function?
      yield* Database.flush();
      yield* TracingService.emitStatus({ message: 'Creating research document...' });

      const target = yield* Database.load(subject);

      const object = yield* Database.add(
        Markdown.make({
          name,
          content,
        }),
      );

      yield* Database.add(
        Relation.make(HasSubject.HasSubject, {
          [Relation.Source]: object,
          [Relation.Target]: target,
          completedAt: new Date().toISOString(),
        }),
      );

      yield* Database.flush();
      log.info('Created research document', { subject, object });

      return {
        document: Obj.getDXN(object).toString(),
      };
    }),
  ),
);
