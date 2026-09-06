//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { commandPath, identifySession, observabilityNamespace, otelEndpoint, projectToken } from './observability';

describe('CLI observability', () => {
  test('names a command by its subcommand path, keeping flags and positionals out', ({ expect }) => {
    expect(commandPath(tree, [])).to.equal('dx');
    expect(commandPath(tree, ['space', 'list'])).to.equal('space list');
    expect(commandPath(tree, ['space', 'list', '--json'])).to.equal('space list');
    expect(commandPath(tree, ['chat', '--prompt', 'my private notes'])).to.equal('chat');
    expect(commandPath(tree, ['--profile', 'work', 'space', 'list'])).to.equal('dx');
    expect(commandPath(tree, ['fn', 'invoke', 'someKey', '{"secret":1}'])).to.equal('fn invoke');
    expect(commandPath(tree, ['fn', 'deploy', '/Users/someone/private/script.ts'])).to.equal('fn deploy');
    expect(commandPath(tree, ['definitely-not-a-command'])).to.equal('dx');
  });

  test('reports nowhere unless asked', ({ expect }) => {
    expect(projectToken()).to.be.undefined;
    expect(otelEndpoint()).to.be.undefined;
  });

  // Aliasing on every run would mint a `$create_alias` per command for the life of the profile.
  test('aliases the installation to the identity once, then identifies', async ({ expect }) => {
    const namespace = fs.mkdtempSync(path.join(os.tmpdir(), 'dx-identify-test-'));
    const calls: string[] = [];
    const observability = {
      alias: (did: string, previous?: string) => calls.push(`alias ${previous}->${did}`),
      identify: (did: string) => calls.push(`identify ${did}`),
    } as unknown as Parameters<typeof identifySession>[0];
    const client = { halo: { identity: { get: () => ({ did: DID }) } } } as unknown as Parameters<
      typeof identifySession
    >[1];

    try {
      await identifySession(observability, client, namespace, INSTALLATION_ID);
      await identifySession(observability, client, namespace, INSTALLATION_ID);
      await identifySession(observability, client, namespace, INSTALLATION_ID);

      expect(calls).to.deep.equal([`alias ${INSTALLATION_ID}->${DID}`, `identify ${DID}`, `identify ${DID}`]);
    } finally {
      fs.rmSync(namespace, { recursive: true, force: true });
    }
  });

  test('reports nothing for a profile with no identity', async ({ expect }) => {
    const calls: string[] = [];
    const observability = {
      alias: () => calls.push('alias'),
      identify: () => calls.push('identify'),
    } as unknown as Parameters<typeof identifySession>[0];
    const client = { halo: { identity: { get: () => undefined } } } as unknown as Parameters<typeof identifySession>[1];

    await identifySession(observability, client, '/nonexistent', undefined);
    expect(calls).to.be.empty;
  });

  test('keeps observability state per profile', ({ expect }) => {
    expect(observabilityNamespace('default')).to.match(/\/\.config\/dx\/profile\/default$/);
    expect(observabilityNamespace('work')).to.not.equal(observabilityNamespace('default'));
  });
});

const DID = 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK';
const INSTALLATION_ID = '8a1d1d1e-8d4c-4c2a-9a4a-3a6e0b6f1f2b';

type Node = { name: string; subcommands: { commands: Node[] }[] };

const node = (name: string, children: Node[] = []): Node => ({
  name,
  subcommands: children.length > 0 ? [{ commands: children }] : [],
});

const tree = node('dx', [node('space', [node('list')]), node('chat'), node('fn', [node('invoke'), node('deploy')])]);
