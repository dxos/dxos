//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { SchemaAST } from '@dxos/effect';

import { FormatAnnotation, TypeFormat } from './types.ts';

/**
 * Email address (RFC 5321)
 * https://datatracker.ietf.org/doc/html/rfc5321#section-4.1.2
 */
export const Email = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)),
  FormatAnnotation.set(TypeFormat.Email),
  Schema.annotate({
    title: 'Email',
    description: 'Email address',
  }),
);

/**
 *
 */
// TODO(burdon): Implement.
export const Formula = Schema.String.pipe(FormatAnnotation.set(TypeFormat.Formula));

/**
 *
 */
// TODO(burdon): Implement.
export const Hostname = Schema.String.pipe(FormatAnnotation.set(TypeFormat.Hostname));

/**
 * Regex
 * https://json-schema.org/understanding-json-schema/reference/regular_expressions
 * https://ecma-international.org/publications-and-standards/standards/ecma-262
 */
// TODO(burdon): Implement.
export const Regex = Schema.String.pipe(FormatAnnotation.set(TypeFormat.Regex));

/**
 * Multi-line text.
 */
export const Text = Schema.String.pipe(FormatAnnotation.set(TypeFormat.Text));

/**
 * https://datatracker.ietf.org/doc/html/rfc3986#section-1.1.3
 */
export const URL = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^(\w+?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i)),
  FormatAnnotation.set(TypeFormat.URL),
  Schema.annotate({
    title: 'URL',
    description: 'URL',
  }),
);

/**
 * UUID (RFC 4122)
 * https://datatracker.ietf.org/doc/html/rfc4122
 */
export const UUID = Schema.String.check(Schema.isUUID()).pipe(
  FormatAnnotation.set(TypeFormat.UUID),
  Schema.annotate({
    [SchemaAST.ExamplesAnnotationId]: ['3e4666bf-d5e5-4aa7-b8ce-cefe41c7568a'],
  }),
);
