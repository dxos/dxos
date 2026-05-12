//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';
import { trim } from '@dxos/util';

import { SourceFile } from '#types';

import { CodeOperation } from '../types';

const HELLO_PATH = 'src/hello.ts';

const HELLO_CONTENT =
  trim`
    //
    // Copyright 2026 DXOS.org
    //

    export const main = (): void => {
      console.log('Hello, World!');
    };

    main();
  ` + '\n';

const handler: Operation.WithHandler<typeof CodeOperation.HelloWorld> = CodeOperation.HelloWorld.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ project }) {
      const code = yield* Database.load(project);
      const fileRefs = code.files ?? [];

      for (const ref of fileRefs) {
        const file = yield* Database.load(ref);
        if (file.path === HELLO_PATH) {
          const text = yield* Database.load(file.content);
          Obj.update(text, (text) => {
            (text as Obj.Mutable<typeof text>).content = HELLO_CONTENT;
          });
          return { path: HELLO_PATH, created: false };
        }
      }

      const file = SourceFile.make({ path: HELLO_PATH, content: HELLO_CONTENT });
      const added = yield* Database.add(file);
      Obj.update(code, (code) => {
        const next = [...(code.files ?? []), Ref.make(added)];
        (code as Obj.Mutable<typeof code>).files = next;
      });
      yield* Database.flush();
      return { path: HELLO_PATH, created: true };
    }),
  ),
);

export default handler;
