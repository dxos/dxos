//
// Copyright 2026 DXOS.org
//

// Serves the codebase explorer from where `deus explore --publish` (and every `deus push` after
// it) uploads it: `ORIGIN` is the public URL of a remote's `site/` folder. Responses are cached
// briefly, so a push shows up within a minute.
//
// Writes (D79): anyone may read; a GitHub user who belongs to `GITHUB_ORG` may also comment, file
// tasks and attach images. The worker cannot run DEUS, so a write is stored in the remote's bucket
// as a request, `<PREFIX>/inbox/<time>-<id>.sexp`, and its images as `<PREFIX>/assets/<sha256>`;
// `deus inbox` applies the requests to the codebase. Without the OAuth settings the explorer stays
// read-only.

const MAX_AGE = 60;
const SESSION_DAYS = 7;
const MAX_ASSET_BYTES = 10 * 1024 * 1024;
const ASSET_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf'];
const SESSION_COOKIE = 'deus_session';
const STATE_COOKIE = 'deus_oauth_state';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith('/auth/')) {
        return await auth(request, env, url);
      }
      if (url.pathname.startsWith('/api/')) {
        return await api(request, env, url);
      }
      if (url.pathname.startsWith('/assets/')) {
        return await asset(env, url);
      }
    } catch (error) {
      return json({ error: error instanceof HttpError ? error.message : 'internal error' }, error instanceof HttpError ? error.status : 500);
    }
    return site(request, env, ctx, url);
  },
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

//
// The static site.
//

const site = async (request, env, ctx, url) => {
  const path = url.pathname === '/' ? '/index.html' : url.pathname;
  const cache = typeof caches === 'undefined' ? undefined : caches.default;
  const key = new Request(`${url.origin}${path}`);
  const cached = await cache?.match(key);
  if (cached) {
    return cached;
  }
  const upstream = await fetch(`${env.ORIGIN.replace(/\/$/, '')}${path}`);
  const response = new Response(upstream.body, upstream);
  response.headers.set('cache-control', `public, max-age=${MAX_AGE}`);
  if (upstream.ok && cache) {
    ctx.waitUntil(cache.put(key, response.clone()));
  }
  return response;
};

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
  const type = object.httpMetadata?.contentType ?? 'application/octet-stream';
  return new Response(object.body, {
    headers: {
      'content-type': ASSET_TYPES.includes(type) ? type : 'application/octet-stream',
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
    return redirect(safeReturn(back), [cookie(SESSION_COOKIE, session, SESSION_DAYS * 24 * 3600), cookie(STATE_COOKIE, '', 0)]);
  }
  throw new HttpError(404, 'not found');
};

const exchangeCode = async (env, code, redirectUri) => {
  const response = await fetch(`${env.GITHUB_OAUTH_URL ?? 'https://github.com'}/login/oauth/access_token`, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code, redirect_uri: redirectUri }),
  });
  const body = await response.json();
  if (!body.access_token) {
    throw new HttpError(400, 'GitHub refused the sign-in');
  }
  return body.access_token;
};

const github = async (env, token, path) => {
  const response = await fetch(`${env.GITHUB_API_URL ?? 'https://api.github.com'}${path}`, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'user-agent': 'deus-explorer' },
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
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
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
  if (url.pathname === '/api/comment') {
    const subject = text(body.subject, 500);
    if (!/^(def:.+|change:[0-9a-f]{64})$/.test(subject)) {
      throw new HttpError(400, 'a comment needs a subject: def:<name> or change:<causal>');
    }
    return json(await enqueue(env, { kind: 'comment', by, subject, note: required(body.note, 'note', assets), assets }));
  }
  if (url.pathname === '/api/task') {
    const title = text(body.title, 300).trim();
    if (!title) {
      throw new HttpError(400, 'a task needs a title');
    }
    return json(await enqueue(env, { kind: 'task', by, title, details: text(body.details, 20000), link: text(body.link, 500), assets }));
  }
  if (url.pathname === '/api/task-comment') {
    const task = text(body.task, 64);
    if (!/^[0-9a-f]{1,64}$/.test(task)) {
      throw new HttpError(400, 'a task comment needs a task id');
    }
    return json(await enqueue(env, { kind: 'task-comment', by, task, note: required(body.note, 'note', assets), assets }));
  }
  throw new HttpError(404, 'not found');
};

const text = (value, limit) => (typeof value === 'string' ? value.slice(0, limit) : '');

/** A note may be empty only when the comment attaches something. */
const required = (value, name, assets) => {
  const note = text(value, 20000);
  if (!note.trim() && assets.length === 0) {
    throw new HttpError(400, `a comment needs a ${name} or an image`);
  }
  return note;
};

const checkAssets = async (env, value) => {
  const list = Array.isArray(value) ? value.slice(0, 10) : [];
  return Promise.all(
    list.map(async (item) => {
      const hash = text(item?.hash, 64);
      if (!/^[0-9a-f]{64}$/.test(hash) || !(await env.BUCKET.head(`${prefix(env)}/assets/${hash}`))) {
        throw new HttpError(400, 'an attachment was not uploaded');
      }
      return { hash, type: text(item.type, 100), name: text(item.name, 200).replace(/[/\\]/g, '_') };
    }),
  );
};

const storeAsset = async (request, env) => {
  const type = (request.headers.get('content-type') ?? '').split(';')[0].trim();
  if (!ASSET_TYPES.includes(type)) {
    throw new HttpError(415, 'attach a PNG, JPEG, GIF, WebP image or a PDF');
  }
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_ASSET_BYTES) {
    throw new HttpError(413, 'an attachment must be under 10 MB');
  }
  const hash = hex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)));
  const key = `${prefix(env)}/assets/${hash}`;
  if (!(await env.BUCKET.head(key))) {
    await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: type } });
  }
  const name = decodeURIComponent(request.headers.get('x-file-name') ?? '') || `${hash.slice(0, 10)}.${type.split('/')[1]}`;
  return { hash, type, name: name.slice(0, 200).replace(/[/\\]/g, '_') };
};

/** Stores a request for `deus inbox`; names start with the time, so the inbox applies them in order. */
const enqueue = async (env, request) => {
  const at = new Date().toISOString();
  const name = `${at.replace(/[:.]/g, '-')}-${randomId().slice(0, 8)}.sexp`;
  const entry = { ...request, at };
  await env.BUCKET.put(`${prefix(env)}/inbox/${name}`, `${requestToSexp(entry)}\n`, { httpMetadata: { contentType: 'text/plain; charset=utf-8' } });
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
// The request format `deus inbox` reads: one S-expression (docs/spec/CORE.md strings).
//

const FIELDS = ['kind', 'by', 'at', 'subject', 'note', 'title', 'details', 'link', 'task'];

export const requestToSexp = (request) => {
  const fields = FIELDS.filter((key) => request[key] !== undefined).map((key) => `(${key} ${quote(request[key])})`);
  const assets = (request.assets ?? []).map((a) => `(asset ${quote(a.hash)} ${quote(a.type)} ${quote(a.name)})`);
  return `(request ${fields.join(' ')} (assets${assets.map((a) => ` ${a}`).join('')}))`;
};

/** A string as Core text prints it: `"`, `\` and control characters escaped. */
export const quote = (value) =>
  `"${String(value).replace(/[\\"\u0000-\u001f\u007f]/g, (char) => {
    if (char === '"' || char === '\\') {
      return `\\${char}`;
    }
    if (char === '\n') {
      return '\\n';
    }
    if (char === '\t') {
      return '\\t';
    }
    if (char === '\r') {
      return '\\r';
    }
    return `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`;
  })}"`;

export const sexpToRequest = (source) => {
  const [form] = parseSexp(source);
  const request = { assets: [] };
  for (const item of Array.isArray(form) ? form.slice(1) : []) {
    if (Array.isArray(item) && item[0] === 'assets') {
      request.assets = item.slice(1).map(([, hash, type, name]) => ({ hash, type, name }));
    } else if (Array.isArray(item) && typeof item[1] === 'string') {
      request[item[0]] = item[1];
    }
  }
  return request;
};

/** Lists become arrays, symbols and strings both become strings: enough to read back a request. */
const parseSexp = (source) => {
  const stack = [[]];
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    if (char === '(') {
      stack.push([]);
      index++;
    } else if (char === ')') {
      const done = stack.pop();
      stack[stack.length - 1].push(done);
      index++;
    } else if (char === '"') {
      let value = '';
      index++;
      while (index < source.length && source[index] !== '"') {
        if (source[index] === '\\') {
          const next = source[index + 1];
          if (next === 'u') {
            value += String.fromCharCode(parseInt(source.slice(index + 2, index + 6), 16));
            index += 6;
            continue;
          }
          value += next === 'n' ? '\n' : next === 't' ? '\t' : next === 'r' ? '\r' : next;
          index += 2;
        } else {
          value += source[index++];
        }
      }
      stack[stack.length - 1].push(value);
      index++;
    } else if (/\s/.test(char)) {
      index++;
    } else {
      let end = index;
      while (end < source.length && !/[\s()"]/.test(source[end])) {
        end++;
      }
      stack[stack.length - 1].push(source.slice(index, end));
      index = end;
    }
  }
  return stack[0];
};

//
// Helpers.
//

const json = (value, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

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

const hex = (bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

const base64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const fromBase64url = (text) => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (char) => char.charCodeAt(0));
