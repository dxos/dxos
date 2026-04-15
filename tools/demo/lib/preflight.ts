//
// Copyright 2026 DXOS.org
//

/**
 * Credential pre-flight. Pings each configured service with the lightest
 * possible call and returns a row per check so `demo.ts` can print a table
 * before the run starts.
 */

export type Check = {
  readonly service: string;
  readonly status: 'ok' | 'missing' | 'failed';
  readonly detail?: string;
};

const hit = async (url: string, options: RequestInit = {}): Promise<Response> => {
  return fetch(url, { ...options, signal: AbortSignal.timeout(5_000) });
};

const anthropic = async (env: NodeJS.ProcessEnv): Promise<Check> => {
  const key = env.ANTHROPIC_API_KEY;
  if (!key) {
    return { service: 'Anthropic', status: 'missing', detail: 'ANTHROPIC_API_KEY' };
  }
  try {
    // 1 token is the minimum meaningful ping; rejects on invalid key fast.
    const response = await hit('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    });
    if (response.ok) {
      return { service: 'Anthropic', status: 'ok' };
    }
    return { service: 'Anthropic', status: 'failed', detail: `${response.status} ${response.statusText}` };
  } catch (err) {
    return { service: 'Anthropic', status: 'failed', detail: String(err) };
  }
};

const trello = async (env: NodeJS.ProcessEnv): Promise<Check> => {
  const key = env.TRELLO_API_KEY;
  const token = env.TRELLO_API_TOKEN;
  const boardId = env.TRELLO_BOARD_ID;
  if (!key || !token) {
    return { service: 'Trello', status: 'missing', detail: 'TRELLO_API_KEY / TRELLO_API_TOKEN' };
  }
  try {
    const url = new URL('https://api.trello.com/1/members/me');
    url.searchParams.set('key', key);
    url.searchParams.set('token', token);
    url.searchParams.set('fields', 'username');
    const response = await hit(url.toString());
    if (!response.ok) {
      return { service: 'Trello', status: 'failed', detail: `${response.status}` };
    }
    const body = (await response.json()) as { username?: string };
    return {
      service: 'Trello',
      status: 'ok',
      detail: [`@${body.username ?? '?'}`, boardId ? `board=${boardId}` : 'no-board-id'].join(' '),
    };
  } catch (err) {
    return { service: 'Trello', status: 'failed', detail: String(err) };
  }
};

const slack = async (env: NodeJS.ProcessEnv): Promise<Check> => {
  const token = env.SLACK_BOT_TOKEN;
  if (!token) {
    return { service: 'Slack', status: 'missing', detail: 'SLACK_BOT_TOKEN' };
  }
  try {
    const response = await hit('https://slack.com/api/auth.test', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
    });
    const body = (await response.json()) as { ok: boolean; team?: string; user?: string; error?: string };
    if (!body.ok) {
      return { service: 'Slack', status: 'failed', detail: body.error };
    }
    return { service: 'Slack', status: 'ok', detail: `${body.team}/@${body.user}` };
  } catch (err) {
    return { service: 'Slack', status: 'failed', detail: String(err) };
  }
};

const github = async (env: NodeJS.ProcessEnv): Promise<Check> => {
  const pat = env.GITHUB_PAT;
  const repo = env.GITHUB_REPO;
  if (!pat) {
    return { service: 'GitHub', status: 'missing', detail: 'GITHUB_PAT' };
  }
  try {
    const response = await hit('https://api.github.com/user', {
      headers: { authorization: `Bearer ${pat}`, accept: 'application/vnd.github.v3+json' },
    });
    if (!response.ok) {
      return { service: 'GitHub', status: 'failed', detail: `${response.status}` };
    }
    const body = (await response.json()) as { login?: string };
    return {
      service: 'GitHub',
      status: 'ok',
      detail: [`@${body.login ?? '?'}`, repo ? `repo=${repo}` : 'no-repo'].join(' '),
    };
  } catch (err) {
    return { service: 'GitHub', status: 'failed', detail: String(err) };
  }
};

const granola = async (env: NodeJS.ProcessEnv): Promise<Check> => {
  // Granola's API does not expose a cheap /me; treat presence-of-key as "configured".
  if (!env.GRANOLA_API_KEY) {
    return { service: 'Granola', status: 'missing', detail: 'GRANOLA_API_KEY' };
  }
  return { service: 'Granola', status: 'ok', detail: 'key present (no server-side check)' };
};

/** Run all pre-flight checks in parallel. */
export const runPreflight = async (env: NodeJS.ProcessEnv): Promise<Check[]> => {
  return Promise.all([anthropic(env), trello(env), slack(env), github(env), granola(env)]);
};

const ICONS = { ok: '✓', missing: '·', failed: '✗' } as const;

export const formatPreflight = (checks: readonly Check[]): string => {
  const width = Math.max(...checks.map((check) => check.service.length));
  return checks
    .map(
      (check) =>
        `  ${ICONS[check.status]}  ${check.service.padEnd(width)}  ${check.status.padEnd(8)}${check.detail ? `  ${check.detail}` : ''}`,
    )
    .join('\n');
};
