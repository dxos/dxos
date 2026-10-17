//
// Copyright 2026 DXOS.org
//

/** A message of a fake channel's history, in the shape Discord's REST API answers with. */
export type FakeMessage = {
  id: string;
  content: string;
  timestamp: string;
  author: { id: string; username: string; global_name?: string };
  thread?: { id: string; name?: string };
};

export type FakeRestCall = { path: string; authorization?: string };

/** The fake's API base; the crawler reaches it through `DiscordEndpoint` with `via: 'direct'`. */
export const FAKE_API_BASE = 'https://discord.test/api/v10';

/**
 * A minimal Discord REST API as a `fetch`: `GET /channels/:id/messages?after=&limit=` answers the oldest page after
 * the cursor, newest first, as Discord does. Every request is recorded with its `Authorization` header.
 */
export const makeFakeRest = (history: Map<string, FakeMessage[]>) => {
  const calls: FakeRestCall[] = [];
  const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const headers = new Headers(input instanceof Request ? input.headers : init?.headers);
    calls.push({ path: `${url.pathname}${url.search}`, authorization: headers.get('Authorization') ?? undefined });
    const match = url.pathname.match(/^\/api\/v10\/channels\/([^/]+)\/messages$/);
    if (!match) {
      return new Response(JSON.stringify({ message: 'Not found', code: 0 }), { status: 404 });
    }
    const after = BigInt(url.searchParams.get('after') ?? '0');
    const limit = Math.min(100, Number(url.searchParams.get('limit') ?? '50'));
    const page = (history.get(match[1]) ?? [])
      .filter((message) => BigInt(message.id) > after)
      .sort((left, right) => (BigInt(left.id) < BigInt(right.id) ? -1 : 1))
      .slice(0, limit)
      .reverse()
      .map((message) => ({ type: 0, channel_id: match[1], mentions: [], ...message }));
    return new Response(JSON.stringify(page), { headers: { 'Content-Type': 'application/json' } });
  };
  return { calls, fetch };
};
