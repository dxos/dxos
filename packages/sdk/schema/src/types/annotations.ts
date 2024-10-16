//
// Copyright 2024 DXOS.org
//

import { type AST, getAnnotation } from '@dxos/effect';

//
// FormatType
// TODO(burdon): Convert to/from string.
// TODO(burdon): Allow pasting and adapting non-conforming values (e.g., with spaces/hyphens).
// TODO(burdon): Tests.
//

export const FormatAnnotationId = Symbol.for('@dxos/schema/annotation/format');

export type FormatAnnotation = {
  filter: RegExp;
  valid?: RegExp;
};

/**
 * @deprecated Use getAnnotation.
 */
export const getFormatAnnotation = (annotated: AST.Annotated) =>
  getAnnotation<FormatAnnotation>(FormatAnnotationId)(annotated);

//
// Number
//

export const NumberAnnotationId = Symbol.for('@dxos/schema/annotation/number');

export type NumberFormatAnnotation = {
  decimal: number;
};

export const RealNumberFormat: FormatAnnotation = {
  filter: /^[+-]?(\d*(\.\d*)?)?$/,
};

export const WholeNumberFormat: FormatAnnotation = {
  filter: /^\d*$/,
};

export const CurrencyAnnotationId = Symbol.for('@dxos/schema/annotation/currency');
export const PercentAnnotationId = Symbol.for('@dxos/schema/annotation/percent');

//
// String
//

export const EmailAnnotationId = Symbol.for('@dxos/schema/annotation/email');

export const EmailFormat: FormatAnnotation = {
  filter: /^[a-zA-Z0-9._%+-]*@?[a-zA-Z0-9.-]*\.?[a-zA-Z]*$/,
  valid: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
};

export const UrlAnnotationId = Symbol.for('@dxos/schema/annotation/url');

export const UrlFormat: FormatAnnotation = {
  filter: /^(\w+?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
};
