//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Identity from './identity';
import * as Wire from './wire';

const toolsList = <T>(tools: T[]) => ({ jsonrpc: '2.0', id: 1, result: { tools } });

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

  describe('narrowRefSchemas', () => {
    test('a ref parameter is narrowed to its object branch rather than an untyped anyOf', ({ expect }) => {
      const message = toolsList([
        {
          name: 'taskCreate',
          inputSchema: {
            type: 'object',
            properties: {
              taskSet: {
                anyOf: [
                  { type: 'object', properties: { '/': { type: 'string' } }, required: ['/'] },
                  { type: 'string' },
                ],
              },
            },
          },
        },
      ]);
      expect(Wire.narrowRefSchemas(message)).to.be.true;
      expect(message.result.tools[0].inputSchema.properties.taskSet).to.deep.equal({
        type: 'object',
        properties: { '/': { type: 'string' } },
        required: ['/'],
      });
    });

    test('an anyOf with more than one object branch is a real union and is left alone', ({ expect }) => {
      const message = toolsList([
        {
          name: 'thing',
          inputSchema: {
            type: 'object',
            properties: {
              value: {
                anyOf: [
                  { type: 'object', properties: { a: { type: 'string' } } },
                  { type: 'object', properties: { b: { type: 'string' } } },
                ],
              },
            },
          },
        },
      ]);
      expect(Wire.narrowRefSchemas(message)).to.be.false;
    });
  });

  describe('decorateInitialize', () => {
    test('the shared identity is merged and the instructions state the skillLoad convention', ({ expect }) => {
      const message: any = { result: { serverInfo: { name: 'DXOS', version: '0.1.0' } } };
      expect(Wire.decorateInitialize(message)).to.be.true;
      expect(message.result.serverInfo).to.deep.equal({
        name: 'DXOS',
        version: '0.1.0',
        title: Identity.identity.title,
        websiteUrl: Identity.identity.websiteUrl,
      });
      expect(message.result.instructions).to.include('skillLoad');
    });

    test('a host field wins over the shared identity', ({ expect }) => {
      const message: any = { result: { serverInfo: { name: 'DXOS' } } };
      Wire.decorateInitialize(message, { serverInfo: { title: 'Something else' } });
      expect(message.result.serverInfo.title).to.equal('Something else');
    });

    test('instructions already on the result are not replaced', ({ expect }) => {
      const message: any = { result: { serverInfo: { name: 'DXOS' }, instructions: 'Custom.' } };
      Wire.decorateInitialize(message);
      expect(message.result.instructions).to.equal('Custom.');
    });

    test('a message that is not an initialize result is untouched', ({ expect }) => {
      const message = toolsList([]);
      expect(Wire.normalize(message)).to.be.false;
    });
  });
});
