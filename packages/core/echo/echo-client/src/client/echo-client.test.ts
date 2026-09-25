//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { PublicKey } from '@dxos/keys';

import { RepoProxy } from '../automerge/index.ts';
import { MirrorRepo } from '../mirror/index.ts';
import { EchoTestBuilder, type EchoTestPeer } from '../testing/index.ts';

describe('EchoClient document mode', () => {
  let builder: EchoTestBuilder;
  let peer: EchoTestPeer;

  beforeEach(async () => {
    vi.stubEnv('DX_ECHO_DOCUMENT_MODE', '');
    vi.stubEnv('DX_ECHO_PROXY_INDEX_READS', '');
    builder = await new EchoTestBuilder().open();
    peer = await builder.createPeer();
  });

  afterEach(async () => {
    await builder.close();
    vi.unstubAllEnvs();
  });

  const repoOf = async (options: Parameters<EchoTestPeer['createClient']>[0]) => {
    const client = await peer.createClient(options);
    const db = await peer.createDatabase(PublicKey.random(), { client });
    return { client, repo: db._repo };
  };

  test('clients hold replicas unless told otherwise', async () => {
    const { client, repo } = await repoOf({});
    expect(client.documentMode).toBe('replica');
    expect(repo).toBeInstanceOf(RepoProxy);
  });

  test('clients of one host can differ, as tabs of one worker do', async () => {
    const proxy = await repoOf({ documentMode: 'proxy' });
    const replica = await repoOf({ documentMode: 'replica' });
    expect(proxy.repo).toBeInstanceOf(MirrorRepo);
    expect(replica.repo).toBeInstanceOf(RepoProxy);
  });

  test('DX_ECHO_DOCUMENT_MODE applies when the client names no mode, and an explicit mode wins', async () => {
    vi.stubEnv('DX_ECHO_DOCUMENT_MODE', 'proxy');
    expect((await repoOf({})).repo).toBeInstanceOf(MirrorRepo);
    expect((await repoOf({ documentMode: 'replica' })).repo).toBeInstanceOf(RepoProxy);
  });

  test('an unknown DX_ECHO_DOCUMENT_MODE leaves the default', async () => {
    vi.stubEnv('DX_ECHO_DOCUMENT_MODE', 'mirror');
    expect((await repoOf({})).client.documentMode).toBe('replica');
  });
});
