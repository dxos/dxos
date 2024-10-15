//
// Copyright 2024 DXOS.org
//

import { type Annotated } from '@effect/schema/AST';
import { Option, pipe } from 'effect';

import { AST } from '@dxos/effect';

// TODO(burdon): Factor out.
export const getAnnotation =
  <T>(annotationId: symbol) =>
  (annotated: Annotated): T | undefined =>
    pipe(AST.getAnnotation<T>(annotationId)(annotated), Option.getOrUndefined);

//
// FormatType
// TODO(burdon): Convert to/from string.
// TODO(burdon): Allow pasting and adapting non-conforming values (e.g., with spaces/hyphens).
//

export const FormatAnnotationId = Symbol.for('@dxos/schema/annotation/format');

export type FormatAnnotation = {
  filter: RegExp;
  valid?: RegExp;
};

export const getFormatAnnotation = (annotated: AST.Annotated) =>
  getAnnotation<FormatAnnotation>(FormatAnnotationId)(annotated);

export const RealNumberFormat: FormatAnnotation = {
  filter: /^[+-]?(\d*(\.\d*)?)?$/,
};

export const EmailFormat: FormatAnnotation = {
  filter: /^[a-zA-Z0-9._%+-]*@?[a-zA-Z0-9.-]*\.?[a-zA-Z]*$/,
  valid: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
};
