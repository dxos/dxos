//
// Copyright 2023 DXOS.org
//

import { Trigger } from '@dxos/async';
import { invariant } from '@dxos/log';
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
    invariant(this.receiptTrigger);
    return this.receiptTrigger.wait();
  }

  waitToBeProcessed(): Promise<void> {
    invariant(this.processTrigger);
    return this.processTrigger.wait();
  }
}
