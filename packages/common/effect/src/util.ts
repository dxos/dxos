//
// Copyright 2024 DXOS.org
//

import { AST } from '@effect/schema';
import { Option, pipe } from 'effect';

export const getAnnotation =
  <T>(annotationId: symbol) =>
  (annotated: AST.Annotated): T | undefined =>
    pipe(AST.getAnnotation<T>(annotationId)(annotated), Option.getOrUndefined);
