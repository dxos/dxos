//
// Copyright 2023 DXOS.org
//

import assert from 'node:assert';

import { Trigger } from '@dxos/async';
import { EchoObjectBatch } from '@dxos/protocols/proto/dxos/echo/object';
import { MutationReceipt } from '@dxos/protocols/proto/dxos/echo/service';

export class Batch {
  public readonly data: EchoObjectBatch = { objects: [] };
  public clientTag: string | null = null;

  public receiptTrigger: Trigger<MutationReceipt> | null = null;
  public processTrigger: Trigger | null = null;

  public receipt: MutationReceipt | null = null;
  public processed = false;

  get committing(): boolean {
    return !!this.receiptTrigger;
  }

  getReceipt(): Promise<MutationReceipt> {
    assert(this.receiptTrigger);
    return this.receiptTrigger.wait();
  }

  waitToBeProcessed(): Promise<void> {
    assert(this.processTrigger);
    return this.processTrigger.wait();
  }
}
