//
// Copyright 2026 DXOS.org
//

import { createHash } from 'node:crypto';
import { type Server, createServer } from 'node:http';
import { type AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, test } from 'vitest';

import * as McpAuth from './McpAuth.ts';

/** What the fake worker saw, for the assertions: the grant is only right if every step carried its part. */
type Seen = {
  registration?: Record<string, unknown>;
  authorize?: URLSearchParams;
  form?: URLSearchParams;
  exchange?: URLSearchParams;
};

const NONCE = 'nonce-1';
const CODE = 'code-1';
const TOKEN = 'token-1';

/**
 * The four endpoints the grant touches, answering as `mcp-space-service` does. The form itself is a
 * real page so the nonce has to be read out of HTML, which is what a worker hands a client.
 */
const fakeWorker = (seen: Seen): Server =>
  createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://fake');
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(chunk as Buffer);
    }
    const body = Buffer.concat(chunks).toString();

    if (url.pathname === '/register' && request.method === 'POST') {
      seen.registration = JSON.parse(body);
      response.writeHead(201, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ client_id: 'client-1' }));
    } else if (url.pathname === '/authorize' && request.method === 'GET') {
      seen.authorize = url.searchParams;
      if (url.searchParams.get('dev_form') !== '1') {
        // A passkey redirect, which a headless client cannot follow.
        response.writeHead(302, { Location: 'http://hub.fake/auth/mcp' });
        response.end();
        return;
      }
      response.writeHead(200, { 'Content-Type': 'text/html' });
      response.end(`<form method="POST"><input type="hidden" name="nonce" value="${NONCE}"></form>`);
    } else if (url.pathname === '/authorize' && request.method === 'POST') {
      seen.form = new URLSearchParams(body);
      const redirect = new URL('http://127.0.0.1/callback');
      redirect.searchParams.set('code', CODE);
      redirect.searchParams.set('state', seen.authorize?.get('state') ?? '');
      response.writeHead(302, { Location: redirect.toString() });
      response.end();
    } else if (url.pathname === '/token' && request.method === 'POST') {
      seen.exchange = new URLSearchParams(body);
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ access_token: TOKEN, token_type: 'bearer' }));
    } else {
      response.writeHead(404);
      response.end();
    }
  });

describe('McpAuth', () => {
  const seen: Seen = {};
  let server: Server;
  let mcpUrl: string;

  beforeAll(async () => {
    server = fakeWorker(seen);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    mcpUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/mcp`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test('mints a bearer through the dev form, as a public PKCE client', async ({ expect }) => {
    const token = await McpAuth.devGrant({
      mcpUrl,
      identityKey: 'ab'.repeat(32),
      haloSpaceId: 'BHALO',
      spaceIds: ['BSPACE1', 'BSPACE2'],
    });
    expect(token).to.equal(TOKEN);

    // A public client: no secret is registered, and the PKCE verifier is the proof at exchange.
    expect(seen.registration?.token_endpoint_auth_method).to.equal('none');
    expect(seen.authorize?.get('dev_form')).to.equal('1');
    expect(seen.authorize?.get('code_challenge_method')).to.equal('S256');
    const verifier = seen.exchange?.get('code_verifier') ?? '';
    const challenge = createHash('sha256').update(verifier).digest().toString('base64url');
    expect(seen.authorize?.get('code_challenge')).to.equal(challenge);

    // The form carries the identity and the spaces the session is granted, and nothing else names them.
    expect(seen.form?.get('nonce')).to.equal(NONCE);
    expect(seen.form?.get('identity_key')).to.equal('ab'.repeat(32));
    expect(seen.form?.get('halo_space_id')).to.equal('BHALO');
    expect(seen.form?.get('space_ids')).to.equal('BSPACE1,BSPACE2');

    expect(seen.exchange?.get('grant_type')).to.equal('authorization_code');
    expect(seen.exchange?.get('code')).to.equal(CODE);
    expect(seen.exchange?.get('client_id')).to.equal('client-1');
  });

  test('a worker that answers with the passkey redirect is a legible failure', async ({ expect }) => {
    // Same fake, form withheld: `dev_form` is what the fake keys on, so a grant without it is what a
    // worker with the form disabled answers.
    const withoutForm = createServer((request, response) => {
      if (request.url?.startsWith('/register')) {
        response.writeHead(201, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ client_id: 'client-2' }));
        return;
      }
      response.writeHead(302, { Location: 'http://hub.fake/auth/mcp' });
      response.end();
    });
    await new Promise<void>((resolve) => withoutForm.listen(0, '127.0.0.1', resolve));
    try {
      const port = (withoutForm.address() as AddressInfo).port;
      await expect(
        McpAuth.devGrant({
          mcpUrl: `http://127.0.0.1:${port}/mcp`,
          identityKey: 'ab'.repeat(32),
          haloSpaceId: 'BHALO',
          spaceIds: [],
        }),
      ).rejects.toThrow(/authorize \(dev form\) answered 302/);
    } finally {
      await new Promise<void>((resolve) => withoutForm.close(() => resolve()));
    }
  });
});
