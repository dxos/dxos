//
// Copyright 2023 DXOS.org
//

import { Trigger } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { EchoObjectBatch } from '@dxos/protocols/proto/dxos/echo/object';
import { MutationReceipt } from '@dxos/protocols/proto/dxos/echo/service';

export class Batch {
  public readonly timestamp = Date.now();
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
    invariant(this.receiptTrigger);
    invariant(this.processTrigger);
    // Waiting on receipt trigger to catch write errors.
    return Promise.all([this.processTrigger.wait(), this.receiptTrigger.wait()]).then(() => {});
  }
}
