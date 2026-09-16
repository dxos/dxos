//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { type Server, createServer } from 'node:http';
import { type AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { type EdgeIdentity } from '@dxos/edge-client';
import { IdentityDid, PublicKey } from '@dxos/keys';
import { EdgeCredentialsHeaderCodec } from '@dxos/protocols';
import { PresentationSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import * as McpAuth from './McpAuth.ts';

/** What the fake EDGE saw, for the assertions: the mint is only right if every step carried its part. */
type Seen = {
  signedChallenge?: string;
  authorization?: string;
  body?: Record<string, unknown>;
};

const CHALLENGE = Buffer.from('nonce-1').toString('base64');
const TOKEN = 'dx-api01-' + 'a'.repeat(48);

/** The route the mint touches twice, answering as the hub behind EDGE's `/hub` prefix does. */
const fakeEdge = (seen: Seen): Server =>
  createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://fake');
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(chunk as Buffer);
    }
    const body = Buffer.concat(chunks).toString();

    if (url.pathname === '/hub/api/api-tokens' && request.method === 'POST' && !request.headers.authorization) {
      // The refusal that carries the challenge, as hub's `edgeAuth` answers a bare request.
      response.writeHead(401, { 'WWW-Authenticate': `VerifiablePresentation challenge="${CHALLENGE}"` });
      response.end('Unauthorized');
    } else if (url.pathname === '/hub/api/api-tokens' && request.method === 'POST') {
      seen.authorization = request.headers.authorization;
      seen.body = JSON.parse(body);
      response.writeHead(201, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ data: { id: 'id-1', prefix: TOKEN.slice(0, 16), token: TOKEN } }));
    } else {
      response.writeHead(404);
      response.end();
    }
  });

/** Signs nothing, but records the challenge it was handed, which is what binds the mint to EDGE's nonce. */
const identityFor = (seen: Seen): EdgeIdentity => ({
  identityDid: IdentityDid.random(),
  peerKey: PublicKey.random().toHex(),
  presentCredentials: async ({ challenge }) => {
    seen.signedChallenge = Buffer.from(challenge).toString('base64');
    return create(PresentationSchema, {});
  },
});

describe('McpAuth', () => {
  const seen: Seen = {};
  let server: Server;
  let edgeUrl: string;

  beforeAll(async () => {
    server = fakeEdge(seen);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    edgeUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test('mints a token with a presentation bound to the challenge hub issued', async ({ expect }) => {
    const token = await McpAuth.mintApiToken({ edgeUrl, identity: identityFor(seen), label: 'eval run' });
    expect(token).to.equal(TOKEN);
    expect(seen.signedChallenge).to.equal(CHALLENGE);
    // The presentation travels in the header the edge middleware decodes, and nothing else names the identity.
    expect(seen.authorization).to.be.a('string');
    expect(() => EdgeCredentialsHeaderCodec.decode(seen.authorization ?? '')).not.toThrow();
    expect(seen.body).to.deep.equal({ label: 'eval run' });
  });

  test('refuses to mint over a cleartext transport, before the first request', async ({ expect }) => {
    // The mint response carries the token, so a transport rejected after it has already published
    // it. Loopback is exempt — that hop never leaves the machine, and is what this suite uses.
    const untouched: Seen = {};
    await expect(
      McpAuth.mintApiToken({ edgeUrl: 'http://edge.example.test', identity: identityFor(untouched) }),
    ).rejects.toThrow(/refusing to mint over http:/);
    expect(untouched.signedChallenge).to.equal(undefined);
  });

  test('a refusal that carries no challenge is a legible failure', async ({ expect }) => {
    const silent = createServer((_request, response) => {
      response.writeHead(401);
      response.end('Unauthorized');
    });
    await new Promise<void>((resolve) => silent.listen(0, '127.0.0.1', resolve));
    try {
      const port = (silent.address() as AddressInfo).port;
      await expect(
        McpAuth.mintApiToken({ edgeUrl: `http://127.0.0.1:${port}`, identity: identityFor({}) }),
      ).rejects.toThrow(/without issuing a challenge/);
    } finally {
      await new Promise<void>((resolve) => silent.close(() => resolve()));
    }
  });
});
