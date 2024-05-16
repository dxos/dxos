//
// Copyright 2024 DXOS.org
//

import { type ReplicantBrain } from '../interface';

export class ReplicantRegistry {
  public static readonly instance = new ReplicantRegistry();

  private readonly _replicantBrains = new Map<string, ReplicantBrain<any>>();

  register(brain: ReplicantBrain<any>) {
    this._replicantBrains.set(brain.name, brain);
  }

  get(name: string): ReplicantBrain<any> {
    return this._replicantBrains.get(name)!;
  }
}
