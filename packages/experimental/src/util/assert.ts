//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

/**
 * A simple syntax sugar to write `value as T` as a statement.
 *
 * NOTE: This does not provide any type safety.
 * It's just for convinience so that autocomplete works for value.
 * It's recomended to check the type URL mannuly beforehand or use `assertAnyType` instead.
 * @param value
 */
// TODO(marik_d): Extract somewhere.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function assumeType<T> (value: unknown): asserts value is T {}

/**
 * Checks the type of messages that come from `google.protobuf.Any` encoding.
 *
 * ## Usage example:
 * ```
 * assertAnyType<dxos.echo.testing.IItemEnvelope>(message, 'dxos.echo.testing.ItemEnvelope');
 * ```
 * @param value
 * @param typeUrl
 */
// TODO(burdon): Move to codec.
export function assertAnyType<T> (value: unknown, typeUrl: string): asserts value is T {
  assertTypeUrl(value, typeUrl);
}

// TODO(burdon): Move to codec.
export function assertTypeUrl (value: any, typeUrl: string) {
  assert(value.__type_url === typeUrl,
    `Expected message with type URL \`${typeUrl}\` instead got \`${value.__type_url}\``);
}
