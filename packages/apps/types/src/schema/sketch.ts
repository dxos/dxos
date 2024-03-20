//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import * as E from '@dxos/echo-schema';

import { TextV0Type } from './document';

const _SketchSchema = S.struct({
  title: S.optional(S.string),
  // TODO(burdon): YJS document (map).
  data: E.ref(TextV0Type),
}).pipe(E.echoObject('braneframe.Sketch', '0.1.0'));
export interface SketchType extends E.ObjectType<typeof _SketchSchema> {}
export const SketchSchema: S.Schema<SketchType> = _SketchSchema;
