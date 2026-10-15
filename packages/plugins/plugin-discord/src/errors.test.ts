//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { EdgeCallFailedError } from '@dxos/protocols';

import { DiscordBotAccessError, DiscordChannelError, errorDetail, toBotRequestError } from './errors.ts';

/** An unhandled EDGE failure as the HTTP client builds it: the code as its message, the body decoded as its cause. */
const httpFailure = (status: number, body: string) =>
  new EdgeCallFailedError({ message: `HTTP code ${status}: .`, status, cause: new Error(body) });

describe('toBotRequestError', () => {
  test('a refusal of the caller is an access error with a readable message', ({ expect }) => {
    const error = toBotRequestError(httpFailure(403, 'Not a member of the space.'));
    expect(DiscordBotAccessError.is(error)).toBe(true);
    expect(error.message).not.toMatch(/HTTP code/);
    expect(errorDetail(error)).toBe('HTTP code 403: . — Not a member of the space.');
  });

  test('an unexpected failure names what failed, keeping the raw code as detail', ({ expect }) => {
    const error = toBotRequestError(httpFailure(500, 'boom'));
    expect(DiscordChannelError.is(error)).toBe(true);
    expect(error.message).toBe('The Discord bot host on EDGE failed.');
    expect(errorDetail(error)).toContain('HTTP code 500');
  });

  test("EDGE's own reason for a bad request is kept", ({ expect }) => {
    const error = toBotRequestError(
      new EdgeCallFailedError({ message: 'The bot token is not in this space.', status: 400 }),
    );
    expect(error.message).toBe('The bot token is not in this space.');
  });

  test('a failure with no response is a reachability error', ({ expect }) => {
    const error = toBotRequestError(new TypeError('Failed to fetch'));
    expect(DiscordChannelError.is(error)).toBe(true);
    expect(errorDetail(error)).toBe('Failed to fetch');
  });
});
