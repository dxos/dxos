//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as Spec from '@dxos/compute/Spec';
import { Database, Ref } from '@dxos/echo';
import * as TextMerge from '@dxos/plugin-github/TextMerge';
import * as LegacyProject from '@dxos/plugin-projects/LegacyProject';
import * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';

import { FrontMatter, readThrough, writeThrough } from '#sync';
import { CodeOperation } from '#types';

import { CodeOperationError } from '../errors.ts';
import { loadSpecText, specName } from './spec-file.ts';

const handler: Operation.WithHandler<typeof CodeOperation.ImportSpecFile> = CodeOperation.ImportSpecFile.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ path, content, base, object, heads }) {
      if (!FrontMatter.readable(content)) {
        return yield* Effect.fail(new CodeOperationError({ message: `Front matter does not parse in ${path}` }));
      }
      const codecs = yield* Capability.getAll(ProjectCapabilities.SpecCodec);
      if (!object || !heads || base === undefined) {
        const spec = yield* Database.add(Spec.make({ name: specName(path), content: FrontMatter.body(content) }));
        const body = FrontMatter.read(spec, content);
        yield* readThrough(codecs, spec, body, path);
        const { text } = yield* loadSpecText(Ref.make(spec));
        return { object: Ref.make(spec), heads: TextMerge.currentHeads(text) };
      }

      const { spec, text } = yield* loadSpecText(object);
      // A text a migration could not load holds its file whole, as it did at `heads`.
      const whole = FrontMatter.holdsCopy(text.content, base);
      // The file's front matter is the spec's fields, so only what follows it merges into the text.
      const baseText = FrontMatter.body(base);
      // A document a codec writes holds its file in another form, so the change merges in the file's form (F-6.2).
      let local = yield* writeThrough(codecs, spec, baseText);
      if (local !== undefined) {
        if (whole) {
          FrontMatter.finishMigration(spec, text, base);
          local = (yield* writeThrough(codecs, spec, baseText)) ?? local;
        }
        const merged = TextMerge.merge({ base: baseText, local, next: FrontMatter.read(spec, content, base) });
        yield* readThrough(codecs, spec, merged, path);
        return { object, heads: TextMerge.currentHeads(text) };
      }

      // Spec.content is Text, so the remote change merges with local edits character by character (F-6.2).
      let next: readonly string[];
      if (whole) {
        // The change applies to the whole file the text held; then its front matter leaves as the migration moves it.
        const held = yield* TextMerge.applyAt(text, { base, next: content, heads });
        LegacyProject.takeFrontMatterFields(spec, base);
        next = yield* TextMerge.applyAt(text, { base: content, next: FrontMatter.body(content), heads: held });
        FrontMatter.read(spec, content, base);
      } else {
        next = yield* TextMerge.applyAt(text, { base: baseText, next: FrontMatter.read(spec, content, base), heads });
      }
      // A change that brings the file its first `feat` block can make the document a codec's.
      if (yield* readThrough(codecs, spec, text.content, path)) {
        return { object, heads: TextMerge.currentHeads(text) };
      }
      return { object, heads: next };
    }),
  ),
);

export default handler;
