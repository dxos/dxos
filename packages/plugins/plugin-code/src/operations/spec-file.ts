//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Obj, Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { SpecDocument } from '@dxos/types';

import { SyncBases } from '#sync';

import { CodeOperationError } from '../errors.ts';

/** The Spec a synced file is bound to, with its loaded content. */
export const loadSpecText = Effect.fn(function* (object: Ref.Ref<Obj.Unknown>) {
  const spec = yield* Database.load(object);
  if (!Obj.instanceOf(SpecDocument.SpecDocument, spec)) {
    return yield* Effect.fail(new CodeOperationError({ message: `Not a Spec: ${object.uri}` }));
  }
  const text = yield* Database.load(spec.content);
  if (!Obj.instanceOf(Text.Text, text)) {
    return yield* Effect.fail(new CodeOperationError({ message: `Spec content is not Text: ${object.uri}` }));
  }
  return { spec, text };
});

/** A Spec's display name from its path: the directory and file, e.g. `plugin-code/PLUGIN.mdl`. */
export const specName = (path: string): string => path.split('/').slice(-2).join('/');

/** The file text each spec document last synced through a codec, shared by the import and the export. */
export const specFileBases = new SyncBases();
