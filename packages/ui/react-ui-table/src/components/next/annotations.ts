//
// Copyright 2024 DXOS.org
//

import { Option, pipe } from 'effect';

import { AST, type S } from '@dxos/effect';

// TODO(burdon): Convert to/from string.
// TODO(burdon): Allow pasting and adapting non-conforming values (e.g., with spaces/hyphens).
export const FormatAnnotationId = Symbol.for('@dxos/schema/annotation/format');

export type FormatType = {
  filter: RegExp;
  valid?: RegExp;
};

export const FormatAnnotation =
  (value: FormatType) =>
  <T extends S.Annotable.All>(self: T): S.Annotable.Self<T> =>
    self.annotations({ [FormatAnnotationId]: value });

export const getFormatAnnotation: (annotated: AST.Annotated) => Option.Option<FormatType> =
  AST.getAnnotation<FormatType>(FormatAnnotationId);

// TODO(burdon): Copy this pattern to echo-schema?
export const getFormat = (annotated: AST.Annotated): FormatType | undefined =>
  pipe(AST.getAnnotation<FormatType>(FormatAnnotationId)(annotated), Option.getOrUndefined);

// TODO(burdon): Commas for locales?
export const RealNumberFormat: FormatType = {
  filter: /^[+-]?(\d*(\.\d*)?)?$/,
};

export const EmailFormat: FormatType = {
  filter: /^[a-zA-Z0-9._%+-]*@?[a-zA-Z0-9.-]*\.?[a-zA-Z]*$/,
  valid: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
};
