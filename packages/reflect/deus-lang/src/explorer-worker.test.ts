//
// Copyright 2026 DXOS.org
//

import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { type ExpectStatic, afterAll, afterEach, beforeEach, describe, test, vi } from 'vitest';

import worker, { type Bucket, type Env, requestToSexp, sexpToRequest } from '../platform/worker/worker.mjs';
import { SEED_PATH } from './kernel/main.ts';
import { runImage } from './kernel/run.ts';

const scratch = mkdtempSync(join(tmpdir(), 'deus-worker-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

/** An R2 binding over a directory, laid out as a directory remote, so `deus inbox` can read what the worker wrote. */
const directoryBucket = (root: string): Bucket => {
  const types = new Map<string, string>();
  const path = (key: string) => join(root, key);
  const read = (key: string) => {
    try {
      return readFileSync(path(key));
    } catch {
      return undefined;
    }
  };
  return {
    get: async (key) => {
      const bytes = read(key);
      return bytes
        ? {
            body: new Uint8Array(bytes),
            httpMetadata: { contentType: types.get(key) },
            text: async () => bytes.toString('utf8'),
          }
        : null;
    },
    head: async (key) => (read(key) ? {} : null),
    put: async (key, value, options) => {
      mkdirSync(dirname(path(key)), { recursive: true });
      writeFileSync(path(key), value);
      types.set(key, options?.httpMetadata?.contentType ?? '');
    },
    delete: async (key) => {
      rmSync(path(key), { force: true });
    },
    list: async ({ prefix }) => {
      const folder = path(prefix);
      let names: string[] = [];
      try {
        names = readdirSync(folder);
      } catch {}
      return { objects: names.map((name) => ({ key: `${prefix}${name}` })) };
    },
  };
};

const ctx = { waitUntil: () => {} };

/** GitHub's OAuth and API, answering for `login`, who is a member when `member` is set. */
const fakeGitHub = (login: string, member: boolean) =>
  vi.fn(async (input: string | URL | Request) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.endsWith('/login/oauth/access_token')) {
      return Response.json({ access_token: `token-${login}` });
    }
    if (url.endsWith('/user')) {
      return Response.json({ login, avatar_url: '' });
    }
    if (url.endsWith('/user/memberships/orgs/dxos')) {
      return member ? Response.json({ state: 'active' }) : new Response('{}', { status: 404 });
    }
    return new Response('site', { status: 200 });
  });

const origin = 'https://explorer.test';

describe('explorer worker', () => {
  let remote: string;
  let env: Env;

  beforeEach(() => {
    remote = mkdtempSync(join(scratch, 'remote-'));
    env = {
      PREFIX: 'project',
      GITHUB_ORG: 'dxos',
      GITHUB_CLIENT_ID: 'client',
      GITHUB_CLIENT_SECRET: 'secret',
      SESSION_SECRET: 'a session secret that is long enough',
      BUCKET: directoryBucket(remote),
    };
  });
  afterEach(() => vi.unstubAllGlobals());

  const call = (path: string, init: RequestInit = {}) => worker.fetch(new Request(`${origin}${path}`, init), env, ctx);

  /** Signs in through the OAuth round trip and returns the session cookie. */
  const signIn = async (expect: ExpectStatic, login: string, member: boolean) => {
    vi.stubGlobal('fetch', fakeGitHub(login, member));
    const start = await call('/auth/login?return=/%23d:List.map');
    const authorize = new URL(start.headers.get('location') ?? '');
    expect(authorize.origin).toBe('https://github.com');
    expect(authorize.searchParams.get('scope')).toBe('read:org');
    expect(authorize.searchParams.get('redirect_uri')).toBe(`${origin}/auth/callback`);
    const stateCookie = (start.headers.get('set-cookie') ?? '').split(';')[0];
    const back = await call(`/auth/callback?code=c&state=${authorize.searchParams.get('state')}`, {
      headers: { cookie: stateCookie },
    });
    expect(back.status).toBe(302);
    expect(back.headers.get('location')).toBe('/#d:List.map');
    return (back.headers.getSetCookie().find((c) => c.startsWith('deus_session=')) ?? '').split(';')[0];
  };

  const post = (path: string, session: string, body: unknown, headers: Record<string, string> = {}) =>
    call(path, {
      method: 'POST',
      headers: { 'cookie': session, 'x-deus': '1', origin, 'content-type': 'application/json', ...headers },
      body: typeof body === 'string' ? body : body instanceof Uint8Array ? new Uint8Array(body) : JSON.stringify(body),
    });

  test('serves the todo app built from examples/react', async ({ expect }) => {
    expect((await call('/demo/todo')).headers.get('location')).toBe('/demo/todo/');
    const page = await call('/demo/todo/');
    expect(await page.text()).toContain('<script type="module" src="bundle.js">');
    const bundle = await call('/demo/todo/bundle.js');
    expect(bundle.headers.get('content-type')).toContain('javascript');
    expect(await bundle.text()).toContain('TodoApp');
    expect((await call('/demo/todo/secret.txt')).status).toBe(404);
  });

  test('is read-only without sign-in settings', async ({ expect }) => {
    delete env.GITHUB_CLIENT_ID;
    expect(await (await call('/api/me')).json()).toMatchObject({ signIn: false, login: null, member: false });
    expect((await call('/auth/login')).status).toBe(404);
  });

  test('a member signs in and files a comment with an image', async ({ expect }) => {
    const session = await signIn(expect, 'octocat', true);
    expect(await (await call('/api/me', { headers: { cookie: session } })).json()).toMatchObject({
      login: 'octocat',
      member: true,
    });

    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 1, 2, 255]);
    const uploaded = await post('/api/asset', session, png, { 'content-type': 'image/png', 'x-file-name': 'shot.png' });
    const asset = await uploaded.json();
    expect(asset).toEqual({
      hash: createHash('sha256').update(png).digest('hex'),
      type: 'image/png',
      name: 'shot.png',
    });
    const served = await call(`/assets/${asset.hash}`);
    expect(served.headers.get('content-type')).toBe('image/png');
    expect(new Uint8Array(await served.arrayBuffer())).toEqual(png);

    const comment = await post('/api/comment', session, {
      subject: 'def:List.map',
      note: 'a "quoted"\nnote',
      assets: [asset],
    });
    expect(comment.status).toBe(200);
    const pending = await (await call('/api/inbox')).json();
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({
      kind: 'comment',
      by: 'github:octocat',
      subject: 'def:List.map',
      note: 'a "quoted"\nnote',
      assets: [asset],
    });
  });

  test('refuses writes from non-members, strangers and other sites', async ({ expect }) => {
    const outsider = await signIn(expect, 'stranger', false);
    expect((await post('/api/comment', outsider, { subject: 'def:List.map', note: 'hi' })).status).toBe(403);
    expect((await post('/api/comment', '', { subject: 'def:List.map', note: 'hi' })).status).toBe(401);
    const member = await signIn(expect, 'octocat', true);
    expect((await post('/api/comment', member, { subject: 'def:List.map', note: 'hi' }, { 'x-deus': '' })).status).toBe(
      403,
    );
    expect(
      (await post('/api/comment', member, { subject: 'def:List.map', note: 'hi' }, { origin: 'https://evil.test' }))
        .status,
    ).toBe(403);
    const forged = member.replace(/\.[^.]+$/, '.forged');
    expect((await post('/api/comment', forged, { subject: 'def:List.map', note: 'hi' })).status).toBe(401);
    expect((await post('/api/comment', member, { subject: 'nothing', note: 'hi' })).status).toBe(400);
    expect((await post('/api/task', member, { title: ' ' })).status).toBe(400);
    expect((await post('/api/task', member, { title: 'x', labels: 'Not A Slug' })).status).toBe(400);
    expect(
      (await post('/api/comment', member, { subject: 'def:List.map', note: 'x', assets: [{ hash: '0'.repeat(64) }] }))
        .status,
    ).toBe(400);
    expect(readdirSync(remote)).toEqual([]);
  });

  test('requests print as Core text and read back', ({ expect }) => {
    const request = {
      kind: 'task',
      by: 'github:o',
      at: 't',
      title: 'tab\there \\ "q"\u0001 é ✓ 😀',
      assets: [{ hash: 'h', type: 'image/png', name: 'shot (1).png' }],
    };
    const text = requestToSexp(request);
    expect(text).toBe(
      '(request (kind "task") (by "github:o") (at "t") (title "tab\\there \\\\ \\"q\\"\\u0001 é ✓ 😀") (assets (asset "h" "image/png" "shot (1).png")))',
    );
    expect(sexpToRequest(text)).toEqual(request);
  });

  // The worker's requests are what `deus inbox` applies: both sides of the inbox format meet here.
  test('deus inbox applies what members filed', { timeout: 180_000 }, async ({ expect }) => {
    const session = await signIn(expect, 'octocat', true);
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 9, 9]);
    const asset = await (
      await post('/api/asset', session, png, { 'content-type': 'image/png', 'x-file-name': 'bug.png' })
    ).json();
    expect((await post('/api/comment', session, { subject: 'def:Shapes.square', note: 'why "side"?' })).status).toBe(
      200,
    );
    expect(
      (
        await post('/api/task', session, {
          title: 'Square negative sides',
          details: 'see the image',
          link: 'Shapes.square',
          labels: 'explorer,report',
          assets: [asset],
        })
      ).status,
    ).toBe(200);

    const seed = readFileSync(SEED_PATH, 'utf8');
    const deus = (...args: string[]) => {
      let stdout = '';
      let stderr = '';
      const { code } = runImage(seed, {
        args,
        stdout: (chunk) => (stdout += chunk),
        stderr: (chunk) => (stderr += chunk),
      });
      return { code, stdout, stderr };
    };
    const codebase = join(scratch, 'inbox-codebase');
    const source = join(scratch, 'shapes.deus');
    writeFileSync(source, 'namespace Shapes\n\ndef square (side : Int) : Int := side * side\n\nend Shapes\n');
    const root = join(import.meta.dirname, '..');
    expect(deus('init', '--empty', '--codebase', codebase).code).toBe(0);
    expect(
      deus('add', join(root, 'deus/builtins.deus'), join(root, 'deus/prelude.deus'), source, '--codebase', codebase),
    ).toMatchObject({ stderr: '', code: 0 });
    expect(deus('remote', 'add', 'origin', join(remote, 'project'), '--codebase', codebase).code).toBe(0);

    const applied = deus('inbox', '--codebase', codebase);
    expect(applied.stderr).toBe('');
    expect(applied.stdout).toMatch(/comment on def:Shapes\.square by github:octocat/);
    expect(applied.stdout).toMatch(/task [0-9a-f]{8} Square negative sides by github:octocat/);
    expect(readdirSync(join(remote, 'project', 'inbox'))).toEqual([]);

    const comments = JSON.parse(deus('comments', 'Shapes.square', '--json', '--codebase', codebase).stdout);
    expect(comments['def:Shapes.square']).toMatchObject([{ author: 'github:octocat', note: 'why "side"?' }]);
    const tasks = JSON.parse(deus('task', 'list', '--json', '--codebase', codebase).stdout);
    expect(tasks[0]).toMatchObject({
      title: 'Square negative sides',
      details: 'see the image',
      links: [{ definition: 'Shapes.square' }],
      labels: ['explorer', 'report'],
      comments: [{ author: 'github:octocat', assets: [asset] }],
    });
    expect(readFileSync(join(codebase, 'assets', asset.hash))).toEqual(Buffer.from(png));
    expect(deus('log', '--codebase', codebase).stdout).toMatch(
      /task: open [0-9a-f]{8} Square negative sides {2}\(by github:octocat\)/,
    );
  });
});
