//
// Copyright 2026 DXOS.org
//

// The budget guard: a Worker that the account's billing alert calls by webhook, and that then cuts
// every other Worker on the account so spending stops (Dmytro: "if $10 budget alert is triggered all
// work is cut"). A cut Worker loses its workers.dev route and its cron triggers; its code, data and
// secrets stay, and `wrangler deploy` brings it back. The guard keeps running so a later alert or a
// drill still reaches it.
//
//   POST /alert             the alert's webhook (Cloudflare sends `cf-webhook-auth`); a billing alert cuts all
//   POST /drill?script=<n>  cuts one Worker, to check the wiring without stopping the others
//   GET  /status            every Worker and whether its route is on
//
// Every request needs the webhook secret in `cf-webhook-auth`. Bindings: `CF_TOKEN` (Workers Scripts
// Write on the account), `ACCOUNT_ID`, `WEBHOOK_SECRET`, `SELF` (this Worker's own name) and
// `POLICY_IDS`, the alert policies whose every alert cuts.

const API = 'https://api.cloudflare.com/client/v4';

/** Alert types that mean money is being spent; anything else (the destination's test message) is ignored. */
export const BILLING_ALERTS = ['billing_budget_alert', 'billing_usage_alert'];

export default {
  async fetch(request, env) {
    return handle(request, env, fetch);
  },
};

/** The guard's handling with `call` in place of `fetch`, so tests can stand in for the Cloudflare API. */
export const handle = async (request, env, call) => {
  const url = new URL(request.url);
  if (!env.WEBHOOK_SECRET || !sameText(request.headers.get('cf-webhook-auth') ?? '', env.WEBHOOK_SECRET)) {
    return json({ error: 'unauthorized' }, 401);
  }
  const api = cloudflare(env, call);
  if (url.pathname === '/status' && request.method === 'GET') {
    return json({ scripts: await status(api, env) });
  }
  if (url.pathname === '/drill' && request.method === 'POST') {
    const script = url.searchParams.get('script');
    if (!script || script === env.SELF) {
      return json({ error: 'name a Worker other than the guard: /drill?script=<name>' }, 400);
    }
    return json({ cut: [await cut(api, script)] });
  }
  if (url.pathname === '/alert' && request.method === 'POST') {
    const alert = await request.json().catch(() => ({}));
    // The policy id is checked too, in case a billing alert's payload names its type differently.
    const billing =
      BILLING_ALERTS.includes(alert.alert_type) || (env.POLICY_IDS ?? '').split(',').includes(alert.policy_id);
    if (!billing) {
      console.log('ignored alert', alert.alert_type ?? alert.text);
      return json({ ignored: alert.alert_type ?? 'not a billing alert' });
    }
    const names = (await api('GET', '/workers/scripts')).map((script) => script.id).filter((name) => name !== env.SELF);
    const results = await Promise.all(names.map((name) => cut(api, name)));
    console.log('budget alert: cut', JSON.stringify(results));
    return json({ alert: alert.alert_type ?? alert.policy_id, cut: results });
  }
  return json({ error: 'not found' }, 404);
};

/** Turns off a Worker's workers.dev route (and previews) and removes its cron triggers. */
const cut = async (api, name) => {
  const script = encodeURIComponent(name);
  const steps = await Promise.allSettled([
    api('POST', `/workers/scripts/${script}/subdomain`, { enabled: false, previews_enabled: false }),
    api('PUT', `/workers/scripts/${script}/schedules`, []),
  ]);
  const failed = steps.filter((step) => step.status === 'rejected').map((step) => String(step.reason?.message));
  return failed.length === 0 ? { script: name, cut: true } : { script: name, cut: false, errors: failed };
};

const status = (api, env) =>
  api('GET', '/workers/scripts').then((scripts) =>
    Promise.all(
      scripts.map(async (script) => ({
        script: script.id,
        guard: script.id === env.SELF,
        route: (await api('GET', `/workers/scripts/${encodeURIComponent(script.id)}/subdomain`)).enabled,
      })),
    ),
  );

/** A call to the account's API that returns `result` or throws with Cloudflare's error messages. */
const cloudflare = (env, call) => async (method, path, body) => {
  const response = await call(`${API}/accounts/${env.ACCOUNT_ID}${path}`, {
    method,
    headers: { 'authorization': `Bearer ${env.CF_TOKEN}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(payload.errors ?? [])}`);
  }
  return payload.result;
};

/** Compares in time that does not depend on where the texts differ. */
const sameText = (left, right) => {
  let diff = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    diff |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return diff === 0;
};

const json = (value, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
