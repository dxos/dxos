//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { FormatAnnotation, FormatEnum } from './types';

/**
 * Email address (RFC 5321)
 * https://datatracker.ietf.org/doc/html/rfc5321#section-4.1.2
 */
export const Email = Schema.String.pipe(
  Schema.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/),
  FormatAnnotation.set(FormatEnum.Email),
  Schema.annotations({
    title: 'Email',
    description: 'Email address',
  }),
);

/**
 *
 */
// TODO(burdon): Implement.
export const Formula = Schema.String.pipe(FormatAnnotation.set(FormatEnum.Formula));

/**
 *
 */
// TODO(burdon): Implement.
export const Hostname = Schema.String.pipe(FormatAnnotation.set(FormatEnum.Hostname));

/**
 *
 */
// TODO(burdon): Implement.
export const JSON = Schema.String.pipe(FormatAnnotation.set(FormatEnum.JSON));

/**
 *
 */
// TODO(burdon): Implement.
export const Markdown = Schema.String.pipe(FormatAnnotation.set(FormatEnum.Markdown));

/**
 * Regex
 * https://json-schema.org/understanding-json-schema/reference/regular_expressions
 * https://ecma-international.org/publications-and-standards/standards/ecma-262
 */
// TODO(burdon): Implement.
export const Regex = Schema.String.pipe(FormatAnnotation.set(FormatEnum.Regex));

/**
 * https://datatracker.ietf.org/doc/html/rfc3986#section-1.1.3
 */
export const URL = Schema.String.pipe(
  Schema.pattern(/^(\w+?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i),
  FormatAnnotation.set(FormatEnum.URL),
  Schema.annotations({
    title: 'URL',
    description: 'URL',
  }),
);

/**
 * UUID (RFC 4122)
 * https://datatracker.ietf.org/doc/html/rfc4122
 */
export const UUID = Schema.UUID.pipe(
  FormatAnnotation.set(FormatEnum.UUID),
  Schema.annotations({
    [SchemaAST.ExamplesAnnotationId]: ['3e4666bf-d5e5-4aa7-b8ce-cefe41c7568a'],
  }),
);
