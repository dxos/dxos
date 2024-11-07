//
// Copyright 2024 DXOS.org
//

import { AST, S } from '@dxos/effect';

import { FormatAnnotationId, FormatEnum } from './types';

/**
 * Email address (RFC 5321)
 * https://datatracker.ietf.org/doc/html/rfc5321#section-4.1.2
 */
export const Email = S.String.pipe(
  S.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/),
  S.annotations({
    [FormatAnnotationId]: FormatEnum.Email,
    [AST.TitleAnnotationId]: 'Email',
    [AST.DescriptionAnnotationId]: 'Email address',
  }),
);

/**
 *
 */
// TODO(burdon): Implement.
export const Formula = S.String.annotations({
  [FormatAnnotationId]: FormatEnum.Formula,
});

/**
 *
 */
// TODO(burdon): Implement.
export const Hostname = S.String.annotations({
  [FormatAnnotationId]: FormatEnum.Hostname,
});

/**
 *
 */
// TODO(burdon): Implement.
export const JSON = S.String.annotations({
  [FormatAnnotationId]: FormatEnum.JSON,
});

/**
 *
 */
// TODO(burdon): Implement.
export const Markdown = S.String.annotations({
  [FormatAnnotationId]: FormatEnum.Markdown,
});

/**
 * Regex
 * https://json-schema.org/understanding-json-schema/reference/regular_expressions
 * https://ecma-international.org/publications-and-standards/standards/ecma-262
 */
// TODO(burdon): Implement.
export const Regex = S.String.annotations({
  [FormatAnnotationId]: FormatEnum.Regex,
});

/**
 * URI (RFC 3986)
 * https://datatracker.ietf.org/doc/html/rfc3986
 */
export const URI = S.String.pipe(
  S.pattern(/^(\w+?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/),
  S.annotations({
    [FormatAnnotationId]: FormatEnum.URI,
    [AST.TitleAnnotationId]: 'URI',
    [AST.DescriptionAnnotationId]: 'Universal resource identifier',
  }),
);

/**
 * UUID (RFC 4122)
 * https://datatracker.ietf.org/doc/html/rfc4122
 */
// TODO(burdon): Implement.
export const UUID = S.String.annotations({
  [FormatAnnotationId]: FormatEnum.UUID,
  examples: ['3e4666bf-d5e5-4aa7-b8ce-cefe41c7568a'],
});
