//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Identity from './identity.ts';
import * as Wire from './wire.ts';

const toolsList = <T>(tools: T[]) => ({ jsonrpc: '2.0', id: 1, result: { tools } });

/** The `initialize` result shape `decorateInitialize` reads and mutates. */
type InitializeMessage = {
  result: {
    serverInfo: Record<string, unknown>;
    instructions?: string;
  };
};

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

  describe('decorateInitialize', () => {
    test('the shared identity is merged and the instructions state the loadSkill convention', ({ expect }) => {
      const message: InitializeMessage = { result: { serverInfo: { name: 'DXOS', version: '0.1.0' } } };
      expect(Wire.decorateInitialize(message)).to.be.true;
      expect(message.result.serverInfo).to.deep.equal({
        name: 'DXOS',
        version: '0.1.0',
        title: Identity.identity.title,
        websiteUrl: Identity.identity.websiteUrl,
      });
      expect(message.result.instructions).to.include('loadSkill');
    });

    // The instructions are the one server text a client loads before any tool is chosen, so they
    // are where the find-then-invoke loop has to be stated: nothing else tells a model that the
    // verbs are behind two tools rather than being tools.
    test('the instructions state the find-then-invoke loop', ({ expect }) => {
      const message: InitializeMessage = { result: { serverInfo: { name: 'DXOS' } } };
      Wire.decorateInitialize(message);
      expect(message.result.instructions).to.include('queryOperations');
      expect(message.result.instructions).to.include('invokeOperation');
    });

    test('a host field wins over the shared identity', ({ expect }) => {
      const message: InitializeMessage = { result: { serverInfo: { name: 'DXOS' } } };
      Wire.decorateInitialize(message, { serverInfo: { title: 'Something else' } });
      expect(message.result.serverInfo.title).to.equal('Something else');
    });

    test('instructions already on the result are not replaced', ({ expect }) => {
      const message: InitializeMessage = { result: { serverInfo: { name: 'DXOS' }, instructions: 'Custom.' } };
      Wire.decorateInitialize(message);
      expect(message.result.instructions).to.equal('Custom.');
    });

    test('a message that is not an initialize result is untouched', ({ expect }) => {
      const message = toolsList([]);
      expect(Wire.normalize(message)).to.be.false;
    });
  });
});
