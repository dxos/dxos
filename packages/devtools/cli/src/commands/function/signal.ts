//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { Flags } from '@oclif/core';

import { type Client, PublicKey } from '@dxos/client';
import { type Signal as SignalType, Signal as SignalSchema, SignalBusInterconnect } from '@dxos/functions';

import { BaseCommand } from '../../base-command';

export default class Signal extends BaseCommand<typeof Signal> {
  static override enableJsonFlag = true;
  static override description = 'Generate a signal.';
  static override flags = {
    ...BaseCommand.flags,
    kind: Flags.string({
      description: 'Signal kind',
      options: ['echo-mutation', 'timer', 'attention', 'suggestion'],
      default: 'attention',
    }),
    dataType: Flags.string({
      description: 'Value type description, passed as signal.data.type',
    }),
    dataJson: Flags.string({
      description: 'Value JSON, passed as signal.data.value',
    }),
    inSpace: Flags.string({
      description: 'In select spaces only',
      multiple: true,
    }),
  };

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      let signalData;
      try {
        signalData = this.flags.dataJson ? JSON.parse(this.flags.dataJson) : {};
      } catch (error: any) {
        this.catch(error);
      }
      const spaces = await this.getSpaces(client, true);
      if (spaces.length === 0) {
        this.log('No spaces found.');
        return;
      }
      const prefixes = this.flags.inSpace ?? spaces.map((s) => s.key.toHex());
      const spacesToSignal = spaces.filter((s) => {
        return prefixes.some((prefix) => s.key.toHex().startsWith(prefix));
      });
      if (spacesToSignal.length === 0) {
        this.log('No spaces found with requested key-prefixes.', prefixes);
        return;
      }
      const signal: SignalType = {
        id: PublicKey.random().toHex(),
        kind: this.flags.kind as any,
        metadata: {
          created: Date.now(),
          source: 'cli',
        },
        data: {
          type: this.flags.dataType ?? 'any',
          value: signalData,
        },
      };
      const _ = S.asserts(SignalSchema)(signal);
      this.log('generating signal:', signal);
      for (const space of spacesToSignal) {
        this.log('signalled in', space.key.toHex());
        SignalBusInterconnect.global.createConnected(space).emit(signal);
      }
    });
  }
}
