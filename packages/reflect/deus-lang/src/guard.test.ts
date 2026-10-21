//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { handle } from '../platform/guard/guard.mjs';

const env = { CF_TOKEN: 'token', ACCOUNT_ID: 'acct', WEBHOOK_SECRET: 'secret', SELF: 'deus-guard' };

/** A stand-in for the Cloudflare API holding two Workers besides the guard; records every write. */
const account = () => {
  const writes: string[] = [];
  const routes = new Map([
    ['deus', true],
    ['other', true],
    ['deus-guard', true],
  ]);
  const call = async (url: string, init: RequestInit) => {
    const path = new URL(url).pathname.replace('/client/v4/accounts/acct', '');
    const ok = (result: unknown) => new Response(JSON.stringify({ success: true, result }));
    if (path === '/workers/scripts') {
      return ok([...routes.keys()].map((id) => ({ id })));
    }
    const [, , , name, area] = path.split('/');
    if (init.method !== 'GET') {
      writes.push(`${init.method} ${name} ${area} ${String(init.body)}`);
    }
    if (area === 'subdomain' && init.method === 'POST') {
      routes.set(name, false);
    }
    return area === 'subdomain' ? ok({ enabled: routes.get(name) }) : ok({ schedules: [] });
  };
  return { call, writes };
};

const request = (path: string, init: RequestInit & { secret?: string } = {}) =>
  new Request(`https://guard.test${path}`, {
    ...init,
    headers: init.secret === undefined ? {} : { 'cf-webhook-auth': init.secret },
  });

const alert = (alertType: string) => JSON.stringify({ alert_type: alertType, text: 'spend reached $10' });

describe('budget guard', () => {
  test('a billing alert cuts every Worker but the guard', async ({ expect }) => {
    const { call, writes } = account();
    const response = await handle(
      request('/alert', { method: 'POST', secret: 'secret', body: alert('billing_budget_alert') }),
      env,
      call,
    );
    expect(response.status).toBe(200);
    expect((await response.json()).cut).toEqual([
      { script: 'deus', cut: true },
      { script: 'other', cut: true },
    ]);
    expect(writes.sort()).toEqual([
      'POST deus subdomain {"enabled":false,"previews_enabled":false}',
      'POST other subdomain {"enabled":false,"previews_enabled":false}',
      'PUT deus schedules []',
      'PUT other schedules []',
    ]);
  });

  test('the destination test message and other alerts cut nothing', async ({ expect }) => {
    const { call, writes } = account();
    const test = JSON.stringify({ text: 'Hello World! This is a test message sent from https://cloudflare.com' });
    expect((await handle(request('/alert', { method: 'POST', secret: 'secret', body: test }), env, call)).status).toBe(
      200,
    );
    await handle(request('/alert', { method: 'POST', secret: 'secret', body: alert('workers_alert') }), env, call);
    expect(writes).toEqual([]);
  });

  test('an alert of the budget policy cuts whatever its type says', async ({ expect }) => {
    const { call, writes } = account();
    const body = JSON.stringify({ policy_id: 'budget', text: 'spend reached $10' });
    await handle(request('/alert', { method: 'POST', secret: 'secret', body }), { ...env, POLICY_IDS: 'budget' }, call);
    expect(writes).toHaveLength(4);
  });

  test('a request without the webhook secret is refused', async ({ expect }) => {
    const { call, writes } = account();
    const body = alert('billing_budget_alert');
    expect((await handle(request('/alert', { method: 'POST', body }), env, call)).status).toBe(401);
    expect((await handle(request('/alert', { method: 'POST', secret: 'wrong', body }), env, call)).status).toBe(401);
    expect(writes).toEqual([]);
  });

  test('a drill cuts one named Worker, never the guard', async ({ expect }) => {
    const { call, writes } = account();
    expect(
      (await handle(request('/drill?script=deus-guard', { method: 'POST', secret: 'secret' }), env, call)).status,
    ).toBe(400);
    await handle(request('/drill?script=other', { method: 'POST', secret: 'secret' }), env, call);
    expect(writes.every((write) => write.includes(' other '))).toBe(true);
    const status = await (await handle(request('/status', { secret: 'secret' }), env, call)).json();
    expect(status.scripts).toEqual([
      { script: 'deus', guard: false, route: true },
      { script: 'other', guard: false, route: false },
      { script: 'deus-guard', guard: true, route: true },
    ]);
  });
});
