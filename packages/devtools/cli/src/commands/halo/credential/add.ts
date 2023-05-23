//
// Copyright 2023 DXOS.org
//

import { Args } from '@oclif/core';
import assert from 'node:assert';

import { Client } from '@dxos/client';
import { schema } from '@dxos/protocols';

import { BaseCommand } from '../../../base-command';

export default class Add extends BaseCommand {
  static override description = 'Import credential into HALO.';
  static override args = {
    credential: Args.string({ description: 'credential', required: false }),
  };

  async run(): Promise<any> {
    const res = await this.parse(Add);
    const { args } = res;
    let { credential: credentialHex } = args;

    if (!credentialHex) {
      credentialHex = await this.stdin;
    }

    assert(credentialHex, 'Invalid credential.');

    return await this.execWithClient(async (client: Client) => {
      const identity = client.halo.identity;
      if (!identity) {
        throw new Error('Profile not initialized.');
      } else {
        try {
          const codec = schema.getCodecForType('dxos.halo.credentials.Credential');
          const credentialBytes = Buffer.from(credentialHex!, 'hex');

          const error = codec.protoType.verify(credentialBytes);
          if (error) {
            throw new Error(error);
          }

          const credential = codec.decode(credentialBytes);
          await client.halo.writeCredentials([credential]);
        } catch (err) {
          throw new Error('Invalid credential.');
        }
      }
    });
  }
}
