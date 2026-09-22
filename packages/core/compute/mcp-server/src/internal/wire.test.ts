//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Identity from './identity.ts';
import * as Wire from './wire.ts';

const toolsList = <T>(tools: T[]) => ({ jsonrpc: '2.0', id: 1, result: { tools } });

const SERVER_INFO_META = 'io.modelcontextprotocol/serverInfo';

/** A result that names the server in `_meta`. */
type StatelessMessage = {
  result: {
    supportedVersions?: string[];
    tools?: unknown[];
    instructions?: string;
    _meta: Record<string, Record<string, unknown>>;
  };
};

const discoverMessage = (instructions?: string): StatelessMessage => ({
  result: {
    supportedVersions: ['2026-07-28'],
    instructions,
    _meta: { [SERVER_INFO_META]: { name: 'DXOS Spaces', version: '0.1.0' } },
  },
});

describe('Wire', () => {
  describe('normalizeToolSchemas', () => {
    test('a parameterless tool schema is rewritten to an empty object schema', ({ expect }) => {
      const message = toolsList([{ name: 'whoami', inputSchema: { anyOf: [{ type: 'object' }, { type: 'array' }] } }]);
      expect(Wire.normalizeToolSchemas(message)).to.be.true;
      expect(message.result.tools[0]).to.deep.include({
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      });
    });

    test('a schema that already declares properties is left alone', ({ expect }) => {
      const schema = { type: 'object', properties: { value: { type: 'string' } } };
      const message = toolsList([{ name: 'taskCreate', inputSchema: schema }]);
      expect(Wire.normalizeToolSchemas(message)).to.be.false;
      expect(message.result.tools[0].inputSchema).to.equal(schema);
    });
  });

  describe('decorateServerInfo', () => {
    test('a server/discover result gets the identity in its metadata and the instructions', ({ expect }) => {
      const message = discoverMessage();
      expect(Wire.normalize(message)).to.be.true;
      expect(message.result._meta[SERVER_INFO_META]).to.deep.equal({
        name: 'DXOS Spaces',
        version: '0.1.0',
        title: Identity.identity.title,
        websiteUrl: Identity.identity.websiteUrl,
      });
      expect(message.result.instructions).to.include('loadSkill');
    });

    // Nothing else tells a model that the verbs are behind two tools rather than being tools.
    test('the instructions state the find-then-invoke loop', ({ expect }) => {
      const message = discoverMessage();
      Wire.normalize(message);
      expect(message.result.instructions).to.include('queryOperations');
      expect(message.result.instructions).to.include('invokeOperation');
    });

    test('a host field wins over the shared identity', ({ expect }) => {
      const message = discoverMessage();
      Wire.normalize(message, { serverInfo: { title: 'Something else' } });
      expect(message.result._meta[SERVER_INFO_META].title).to.equal('Something else');
    });

    test('instructions already on the result are not replaced', ({ expect }) => {
      const message = discoverMessage('Custom.');
      Wire.normalize(message);
      expect(message.result.instructions).to.equal('Custom.');
    });

    test('a later result names the same server but repeats no instructions', ({ expect }) => {
      const message: StatelessMessage = {
        result: { tools: [], _meta: { [SERVER_INFO_META]: { name: 'DXOS Spaces', version: '0.1.0' } } },
      };
      expect(Wire.normalize(message)).to.be.true;
      expect(message.result._meta[SERVER_INFO_META].title).to.equal(Identity.identity.title);
      expect(message.result.instructions).to.be.undefined;
    });

    test('a message that names no server is untouched', ({ expect }) => {
      const message = toolsList([]);
      expect(Wire.normalize(message)).to.be.false;
    });
  });

  // TODO(wittjosiah): Remove when every DXOS MCP server drops 2025-era MCP support.
  describe('2025-era MCP initialize result', () => {
    type InitializeMessage = {
      result: {
        serverInfo: Record<string, unknown>;
        instructions?: string;
      };
    };

    test('the shared identity is merged at the top level and the instructions are added', ({ expect }) => {
      const message: InitializeMessage = { result: { serverInfo: { name: 'DXOS', version: '0.1.0' } } };
      expect(Wire.normalize(message)).to.be.true;
      expect(message.result.serverInfo).to.deep.equal({
        name: 'DXOS',
        version: '0.1.0',
        title: Identity.identity.title,
        websiteUrl: Identity.identity.websiteUrl,
      });
      expect(message.result.instructions).to.include('queryOperations');
    });

    test('a host field wins over the shared identity', ({ expect }) => {
      const icons = [{ src: 'https://mcp.example/icon.png' }];
      const message: InitializeMessage = { result: { serverInfo: { name: 'DXOS' } } };
      Wire.normalize(message, { serverInfo: { title: 'Something else', icons } });
      expect(message.result.serverInfo).to.deep.include({ name: 'DXOS', title: 'Something else', icons });
    });

    test('instructions already on the result are not replaced', ({ expect }) => {
      const message: InitializeMessage = { result: { serverInfo: { name: 'DXOS' }, instructions: 'Custom.' } };
      Wire.normalize(message);
      expect(message.result.instructions).to.equal('Custom.');
    });
  });
});
