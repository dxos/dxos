//
// Copyright 2026 DXOS.org
//

// The DEUS Worker (D164): the only thing that touches the codebases bucket. `/v1/` is the
// replication API that `deus push` and `deus pull` use (remote.mjs); everything else is a
// codebase explorer, read from its project's `site/` folder, where every push of `main` writes it:
// `/@owner/project/…` is that project's (D184), and any other path is the project `PREFIX`'s.
//
// Writes from the explorer (D82): anyone may read; a GitHub user who belongs to `GITHUB_ORG` may
// also comment, file tasks and attach images. The worker cannot run DEUS, so a write is stored in
// the project's folder as a request, `<PREFIX>/inbox/<time>-<id>.sexp`, and its images as
// `<PREFIX>/assets/<sha256>`; `deus inbox` applies the requests to the codebase. Without the OAuth
// settings the explorer stays read-only.

import { addressOfFolder, projectAt } from './address.mjs';
import { demoFiles } from './gen/demo-todo.mjs';
import { appFiles, hubFiles } from './gen/explorer-app.mjs';
import * as inbox from './gen/inbox.js';
import * as routes from './gen/routes.js';
import * as sites from './gen/site.js';
import * as writes from './gen/writes.js';
import { liveHead, warmLive, warmPages } from './live.mjs';
import { HttpError, hex, json, remoteApi } from './remote.mjs';

const SESSION_DAYS = 7;
const SESSION_COOKIE = 'deus_session';
const STATE_COOKIE = 'deus_oauth_state';

export default {
  /** `deus-live`: a pushed head to draw (D192), sent when its pack's index lands. */
  async queue(batch, env, ctx) {
    for (const message of batch.messages) {
      // A head to draw, or a chunk of its definition pages.
      await (message.body.causal ? warmPages(env, ctx, message.body) : warmLive(env, ctx, message.body.project));
      message.ack();
    }
  },
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // Which project, pinned version and area a path names is `Worker.Routes.route`, in DEUS.
    const route = routes.route(url.pathname);
    let base = '';
    if (route.owner) {
      const target = projectAt([route.owner, route.project]);
      if (!target) {
        return notFound();
      }
      // The rest of the request is the PREFIX project's handling, on this project's folder.
      env = { ...env, PREFIX: target.folder };
      base = `/${route.owner}/${route.project}`;
    }
    // A page served at `/` loads everything relative to `/v/<version>/` (D166); only the site's top-level files are
    // versioned, so every other path is the same with the prefix dropped.
    url.pathname = route.path;
    try {
      switch (route.area) {
        case 'v1':
          return await remoteApi(request, env, ctx, url);
        case 'auth':
          return await auth(request, env, url);
        case 'api':
          return await api(request, env, url);
        case 'assets':
          return await asset(env, url);
      }
    } catch (error) {
      if (!(error instanceof HttpError)) {
        // Shown by `wrangler tail`; the client only learns that the Worker failed.
        console.error(error);
      }
      return json(
        { error: error instanceof HttpError ? error.message : 'internal error' },
        error instanceof HttpError ? error.status : 500,
      );
    }
    return site(env, ctx, url, route.version || undefined, base, request);
  },
};

//
// The static site.
//

const site = async (env, ctx, url, version, base, request) => {
  // What answers the path, its bucket key and cache header are `Worker.Site`, in DEUS.
  const step = sites.plan(url.pathname, Boolean(base), Boolean(version));
  switch (step.kind) {
    case 'missing':
      return notFound();
    case 'redirect':
      return new Response(null, { status: 301, headers: { location: step.name } });
    case 'demo':
      return new Response(demoFiles[step.name], {
        headers: { 'content-type': DEMO_TYPES[step.name], 'cache-control': 'public, max-age=300' },
      });
  }
  if (!env.BUCKET) {
    return notFound();
  }
  switch (step.kind) {
    case 'hub':
      return hubPage(step.name);
    // The app ships with the Worker and reads the codebase live (D192), so its page never waits on a publish.
    case 'app':
      return appAsset(step.name);
  }
  const path = step.name;
  if (step.kind === 'page') {
    const api = await liveApi(env, ctx);
    if (api) {
      return livePage(api, base);
    }
  }
  // A top-level file named without a version is the one at the head `site/HEAD` names.
  if (step.kind === 'page' || step.kind === 'current') {
    const head = await readHead(env);
    if (head && step.kind === 'page') {
      return page(env, head, base);
    }
    version = head;
  }
  const key = sites.key(prefix(env), version ?? '', path);
  const cache = typeof caches === 'undefined' ? undefined : caches.default;
  const cacheKey = new Request(`${url.origin}/__r2/${key}`);
  const cached = await cache?.match(cacheKey);
  if (cached) {
    return cached;
  }
  const object = await env.BUCKET.get(key);
  if (!object) {
    if (!sites.pageOnMiss(path, request?.headers.get('sec-fetch-dest') === 'document')) {
      return notFound();
    }
    const api = await liveApi(env, ctx);
    if (api) {
      return livePage(api, base);
    }
    const head = await readHead(env);
    return head ? page(env, head, base) : notFound();
  }
  const response = new Response(object.body, {
    headers: {
      'content-type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      'cache-control': sites.cacheControl(version ?? '', path),
    },
  });
  if (cache) {
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
  }
  return response;
};

const notFound = () => new Response('not found', { status: 404, headers: { 'cache-control': 'no-store' } });

/** The version `site/HEAD` names, read at most every few seconds per isolate; undefined before the first versioned publish. */
const readHead = async (env) => {
  const cached = headsOf(env.BUCKET).get(prefix(env));
  if (cached && cached.at > Date.now() - HEAD_SECONDS * 1000) {
    return cached.version;
  }
  const object = await env.BUCKET.get(`${prefix(env)}/site/HEAD`);
  const version = object ? (await object.text()).trim() : undefined;
  const head = { at: Date.now(), version: version && /^[0-9a-f]{16}$/.test(version) ? version : undefined };
  headsOf(env.BUCKET).set(prefix(env), head);
  return head.version;
};

const HEAD_SECONDS = 5;
/** Per bucket binding and project folder, so one isolate serving several keeps them apart. */
const heads = new WeakMap();

const headsOf = (bucket) => {
  let byFolder = heads.get(bucket);
  if (!byFolder) {
    byFolder = new Map();
    heads.set(bucket, byFolder);
  }
  return byFolder;
};

/** The app page of `version`, with every relative load pinned to that version by a `<base>`. */
const page = async (env, version, base) => {
  const object = await env.BUCKET.get(`${prefix(env)}/site/v/${version}/index.html`);
  if (!object) {
    return notFound();
  }
  const html = (await object.text()).replace('<head>', `<head><base href="${base}/v/${version}/" />`);
  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' },
  });
};

/** The live explorer API of the project's main branch at its head (D192), or undefined before its first push. */
const liveApi = async (env, ctx) => {
  const shown = await liveHead(env, ctx, prefix(env), 'main');
  return shown && `/v1/${addressOfFolder(prefix(env)) ?? prefix(env)}/live/${shown.causal}`;
};

/** The app's page, reading the codebase through `api`; its files are the Worker's own. */
const livePage = (api, base) =>
  new Response(
    appFiles['index.html'].replace(
      '<head>',
      `<head><base href="${base}/" /><script>globalThis.DEUS_LIVE = ${JSON.stringify(api)};</script>`,
    ),
    { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' } },
  );

const APP_ASSETS = { 'app.js': 'text/javascript; charset=utf-8', 'app.css': 'text/css; charset=utf-8' };

/** One of the app's files; it changes with a deploy, so it is cached only briefly. */
const hubPage = (name) =>
  new Response(hubFiles[name], {
    headers: {
      'content-type': name.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8',
      'cache-control': name.endsWith('.js') ? 'public, max-age=60' : 'no-cache',
    },
  });

const DEMO_TYPES = {
  'index.html': 'text/html; charset=utf-8',
  'app.css': 'text/css; charset=utf-8',
  'bundle.js': 'text/javascript; charset=utf-8',
};

const appAsset = (name) =>
  new Response(appFiles[name], {
    headers: { 'content-type': APP_ASSETS[name], 'cache-control': 'public, max-age=60' },
  });

/** Assets are named by their SHA-256, so a stored one never changes. */
const asset = async (env, url) => {
  const hash = url.pathname.slice('/assets/'.length);
  if (!/^[0-9a-f]{64}$/.test(hash) || !env.BUCKET) {
    return new Response('not found', { status: 404 });
  }
  const object = await env.BUCKET.get(`${prefix(env)}/assets/${hash}`);
  if (!object) {
    return new Response('not found', { status: 404 });
  }
  return new Response(object.body, {
    headers: {
      'content-type': writes.servedType(object.httpMetadata?.contentType ?? ''),
      'cache-control': 'public, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
    },
  });
};

const prefix = (env) => (env.PREFIX ?? 'deus').replace(/\/$/, '');

//
// Sign-in.
//

const signInConfigured = (env) => Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET && env.SESSION_SECRET);

const auth = async (request, env, url) => {
  if (url.pathname === '/auth/logout') {
    return redirect('/', [cookie(SESSION_COOKIE, '', 0)]);
  }
  if (!signInConfigured(env)) {
    throw new HttpError(404, 'sign-in is not configured');
  }
  if (url.pathname === '/auth/login') {
    const state = randomId();
    const back = safeReturn(url.searchParams.get('return'));
    const authorize = new URL(`${env.GITHUB_OAUTH_URL ?? 'https://github.com'}/login/oauth/authorize`);
    authorize.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
    authorize.searchParams.set('redirect_uri', `${url.origin}/auth/callback`);
    // `read:org` lets the membership check see members who keep their membership private.
    authorize.searchParams.set('scope', 'read:org');
    authorize.searchParams.set('state', state);
    return redirect(authorize.toString(), [cookie(STATE_COOKIE, `${state}|${back}`, 600)]);
  }
  if (url.pathname === '/auth/callback') {
    const [expected, back] = (readCookie(request, STATE_COOKIE) ?? '').split('|');
    const code = url.searchParams.get('code');
    if (!code || !expected || url.searchParams.get('state') !== expected) {
      throw new HttpError(400, 'sign-in expired; try again');
    }
    const token = await exchangeCode(env, code, `${url.origin}/auth/callback`);
    const user = await github(env, token, '/user');
    const member = await isMember(env, token);
    const session = await sign(env, {
      login: user.login,
      avatar: user.avatar_url ?? '',
      member,
      exp: Date.now() + SESSION_DAYS * 24 * 3600 * 1000,
    });
    return redirect(safeReturn(back), [
      cookie(SESSION_COOKIE, session, SESSION_DAYS * 24 * 3600),
      cookie(STATE_COOKIE, '', 0),
    ]);
  }
  throw new HttpError(404, 'not found');
};

const exchangeCode = async (env, code, redirectUri) => {
  const response = await fetch(`${env.GITHUB_OAUTH_URL ?? 'https://github.com'}/login/oauth/access_token`, {
    method: 'POST',
    headers: { 'accept': 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });
  const body = await response.json();
  if (!body.access_token) {
    throw new HttpError(400, 'GitHub refused the sign-in');
  }
  return body.access_token;
};

const github = async (env, token, path) => {
  const response = await fetch(`${env.GITHUB_API_URL ?? 'https://api.github.com'}${path}`, {
    headers: {
      'authorization': `Bearer ${token}`,
      'accept': 'application/vnd.github+json',
      'user-agent': 'deus-explorer',
    },
  });
  if (!response.ok) {
    throw new HttpError(502, `GitHub answered ${response.status}`);
  }
  return response.json();
};

/** An active membership of the org; pending invitations and outside collaborators do not count. */
const isMember = async (env, token) => {
  try {
    const membership = await github(env, token, `/user/memberships/orgs/${env.GITHUB_ORG ?? 'dxos'}`);
    return membership.state === 'active';
  } catch {
    return false;
  }
};

/** Only a path on this site, so a sign-in link cannot send anyone elsewhere. */
const safeReturn = (value) => (value && value.startsWith('/') && !value.startsWith('//') ? value : '/');

//
// Sessions: the payload and an HMAC-SHA256 of it, so the cookie cannot be forged; no GitHub token is kept.
//

const sign = async (env, payload) => {
  const body = base64url(new TextEncoder().encode(JSON.stringify(payload)));
  return `${body}.${await hmac(env.SESSION_SECRET, body)}`;
};

const sessionOf = async (request, env) => {
  const value = readCookie(request, SESSION_COOKIE);
  if (!value || !signInConfigured(env)) {
    return undefined;
  }
  const [body, signature] = value.split('.');
  if (!body || !signature || signature !== (await hmac(env.SESSION_SECRET, body))) {
    return undefined;
  }
  const payload = JSON.parse(new TextDecoder().decode(fromBase64url(body)));
  return payload.exp > Date.now() ? payload : undefined;
};

const hmac = async (secret, text) => {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return base64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text))));
};

//
// The write API.
//

const api = async (request, env, url) => {
  const session = await sessionOf(request, env);
  if (url.pathname === '/api/me') {
    return json({
      signIn: signInConfigured(env),
      login: session?.login ?? null,
      avatar: session?.avatar ?? null,
      member: Boolean(session?.member),
      org: env.GITHUB_ORG ?? 'dxos',
    });
  }
  if (url.pathname === '/api/inbox' && request.method === 'GET') {
    return json(await pending(env));
  }
  if (request.method !== 'POST') {
    throw new HttpError(405, 'method not allowed');
  }
  // A cross-site form cannot set this header, and the origin must be this site.
  const origin = request.headers.get('origin');
  if (request.headers.get('x-deus') !== '1' || (origin && origin !== url.origin)) {
    throw new HttpError(403, 'cross-site request refused');
  }
  if (!session) {
    throw new HttpError(401, 'sign in with GitHub to write');
  }
  if (!session.member) {
    throw new HttpError(403, `only members of the ${env.GITHUB_ORG ?? 'dxos'} GitHub organization can write`);
  }
  if (!env.BUCKET) {
    throw new HttpError(503, 'this explorer has no bucket to write to');
  }
  const by = `github:${session.login}`;
  if (url.pathname === '/api/asset') {
    return json(await storeAsset(request, env));
  }
  const body = await request.json().catch(() => {
    throw new HttpError(400, 'the body must be JSON');
  });
  const assets = await checkAssets(env, body.assets);
  // What may be written, and the request it makes, is `Worker.Writes.request`, in DEUS.
  const made = writes.request(url.pathname, body, by, assets);
  if (made.error !== undefined) {
    throw new HttpError(made.status, made.error);
  }
  return json(await enqueue(env, made));
};

const checkAssets = async (env, value) => {
  const list = Array.isArray(value) ? value.slice(0, 10) : [];
  return Promise.all(
    list.map(async (item) => {
      // What an attachment may say is `Worker.Writes.attachment`, in DEUS; that it was uploaded is a read.
      const checked = writes.attachment(item ?? {});
      if (checked.error !== undefined || !(await env.BUCKET.head(`${prefix(env)}/assets/${checked.hash}`))) {
        throw new HttpError(400, 'an attachment was not uploaded');
      }
      return checked;
    }),
  );
};

const storeAsset = async (request, env) => {
  const bytes = new Uint8Array(await request.arrayBuffer());
  // Which uploads are kept is `Worker.Writes.upload`, in DEUS.
  const upload = writes.upload(request.headers.get('content-type') ?? '', bytes.length);
  if (upload.error !== undefined) {
    throw new HttpError(upload.status, upload.error);
  }
  const hash = hex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)));
  const key = `${prefix(env)}/assets/${hash}`;
  if (!(await env.BUCKET.head(key))) {
    await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: upload.type } });
  }
  const name = writes.attachmentName(decodeURIComponent(request.headers.get('x-file-name') ?? ''), hash, upload.type);
  return { hash, type: upload.type, name };
};

/** Stores a request for `deus inbox`; names start with the time, so the inbox applies them in order. */
const enqueue = async (env, request) => {
  const at = new Date().toISOString();
  const name = `${at.replace(/[:.]/g, '-')}-${randomId().slice(0, 8)}.sexp`;
  const entry = { ...request, at };
  await env.BUCKET.put(`${prefix(env)}/inbox/${name}`, `${requestToSexp(entry)}\n`, {
    httpMetadata: { contentType: 'text/plain; charset=utf-8' },
  });
  return { name, ...entry };
};

/** The requests not yet applied, oldest first, so the app can show them before the next push. */
const pending = async (env) => {
  if (!env.BUCKET) {
    return [];
  }
  const listed = await env.BUCKET.list({ prefix: `${prefix(env)}/inbox/` });
  const names = listed.objects.map((object) => object.key).sort();
  const requests = await Promise.all(
    names.map(async (key) => {
      const object = await env.BUCKET.get(key);
      return object ? { name: key.split('/').pop(), ...sexpToRequest(await object.text()) } : undefined;
    }),
  );
  return requests.filter(Boolean);
};

//
// The request format `deus inbox` reads: one S-expression, printed and read by the toolchain's `Sexp` in DEUS
// (`Worker.Inbox`, platform/worker/deus/inbox.deus), so the Worker and the CLI agree on every escape.
//

export const requestToSexp = (request) => inbox.text(request);

export const sexpToRequest = (source) => inbox.request(source);

//
// Helpers.
//

const redirect = (location, cookies = []) => {
  const headers = new Headers({ location, 'cache-control': 'no-store' });
  for (const value of cookies) {
    headers.append('set-cookie', value);
  }
  return new Response(null, { status: 302, headers });
};

const cookie = (name, value, maxAge) => `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;

const readCookie = (request, name) => {
  for (const part of (request.headers.get('cookie') ?? '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) {
      return rest.join('=');
    }
  }
  return undefined;
};

const randomId = () => hex(crypto.getRandomValues(new Uint8Array(16)));

const base64url = (bytes) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const fromBase64url = (text) =>
  Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (char) => char.charCodeAt(0));
