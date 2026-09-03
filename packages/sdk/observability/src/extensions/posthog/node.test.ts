//
// Copyright 2026 DXOS.org
//

import { describe, expect, test, vi } from 'vitest';

import { Config } from '@dxos/config';
import { EffectEx } from '@dxos/effect';

import * as ObservabilityExtension from '../../ObservabilityExtension';
import { extensions } from './node';

const DID = 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK';
const INSTALLATION_ID = '8a1d1d1e-8d4c-4c2a-9a4a-3a6e0b6f1f2b';
const TOKEN = 'phc_test';

const captured: { event: string; distinctId?: string; properties?: Record<string, unknown> }[] = [];
const mcpCaptured: Record<string, unknown>[] = [];

vi.mock('@posthog/mcp', () => ({
  PostHogMCP: class {
    capture(message: { distinctId?: string; event: string; properties?: Record<string, unknown> }) {
      captured.push(message);
    }

    captureException(error: unknown, distinctId?: string) {
      captured.push({ event: '$exception', distinctId, properties: { error } });
    }

    captureInitialize(data: Record<string, unknown>) {
      mcpCaptured.push({ event: '$mcp_initialize', ...data });
    }

    captureToolCall(data: Record<string, unknown>) {
      mcpCaptured.push({ event: '$mcp_tool_call', ...data });
    }

    identify() {}
    alias() {}
    flush() {
      return Promise.resolve();
    }

    shutdown() {
      return Promise.resolve();
    }
  },
}));

describe('posthog node extension', () => {
  test('attributes events to the current distinct id, with the registered properties', async () => {
    captured.length = 0;
    const extension = await make(INSTALLATION_ID);

    api(extension, 'events').captureEvent('cli.command', { command: 'space list' });
    expect(captured).to.deep.equal([
      {
        distinctId: INSTALLATION_ID,
        event: 'cli.command',
        properties: { release: '1.2.3', command: 'space list' },
      },
    ]);

    extension.identify?.(DID);
    api(extension, 'errors').captureException(new Error('boom'));
    expect(captured[1].distinctId).to.equal(DID);
  });

  test('drops events when there is nobody to attribute them to', async () => {
    captured.length = 0;
    const extension = await make(undefined);

    api(extension, 'events').captureEvent('cli.command');
    expect(captured).to.be.empty;

    extension.identify?.(DID);
    api(extension, 'events').captureEvent('cli.command');
    expect(captured).to.have.length(1);
  });

  test('drops events while disabled', async () => {
    captured.length = 0;
    const extension = await make(INSTALLATION_ID);

    await EffectEx.runPromise(extension.disable!());
    api(extension, 'events').captureEvent('cli.command');
    expect(extension.enabled).to.be.false;
    expect(captured).to.be.empty;

    await EffectEx.runPromise(extension.enable!());
    api(extension, 'events').captureEvent('cli.command');
    expect(captured).to.have.length(1);
  });

  test('serves the MCP events under their own kind', async () => {
    mcpCaptured.length = 0;
    const extension = await make(DID);
    const mcp = api(extension, 'mcp');

    const session = { sessionId: 'session-1', clientName: 'claude-code', clientVersion: '2.1.0' };
    mcp.captureInitialize(session);
    mcp.captureToolCall({ ...session, toolName: 'whoami', durationMs: 12, isError: false });

    expect(mcpCaptured[0]).to.include({ event: '$mcp_initialize', clientName: 'claude-code', sessionId: 'session-1' });
    expect(mcpCaptured[1]).to.include({ event: '$mcp_tool_call', toolName: 'whoami', sessionId: 'session-1' });
    expect(mcpCaptured[1].properties).to.include({
      $mcp_client_name: 'claude-code',
      $mcp_server_name: 'dxos-cli',
      $mcp_server_version: '1.2.3',
    });
  });

  // Events carry the identity DID, so a host that would put it on the wire in the clear reports
  // nothing rather than reporting insecurely.
  test('stubs itself on a plaintext host, but not on loopback', async () => {
    for (const host of ['http://posthog.example.com', 'not-a-url', '']) {
      const extension = await make(DID, host);
      expect(extension.apis, host).to.be.empty;
    }
    for (const host of ['https://o.composer.space', 'http://localhost:8000']) {
      const extension = await make(DID, host);
      expect(extension.apis, host).to.not.be.empty;
    }
  });

  test('stubs itself when no project token is configured', async () => {
    const extension = await EffectEx.runPromise(extensions({ config: new Config({}), distinctId: DID }));
    expect(extension.apis).to.be.empty;
  });
});

const make = (distinctId: string | undefined, host?: string): Promise<ObservabilityExtension.Extension> =>
  EffectEx.runPromise(
    extensions({
      config: new Config({}),
      apiKey: TOKEN,
      release: '1.2.3',
      distinctId,
      host,
      mcpServer: { name: 'dxos-cli', version: '1.2.3' },
    }),
  );

const api = <K extends ObservabilityExtension.ExtensionApi['kind']>(
  extension: ObservabilityExtension.Extension,
  kind: K,
): Extract<ObservabilityExtension.ExtensionApi, { kind: K }> => {
  const found = extension.apis.find(
    (entry): entry is Extract<ObservabilityExtension.ExtensionApi, { kind: K }> => entry.kind === kind,
  );
  if (!found) {
    throw new Error(`No ${kind} api on the extension.`);
  }
  return found;
};
