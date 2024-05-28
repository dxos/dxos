//
// Copyright 2024 DXOS.org
//

import { type ReplicantClass } from '../plan';

/**
 * Registry for all replicants.
 * Used to spawn correct replicants in subprocesses.
 */
export class ReplicantRegistry {
  public static readonly instance = new ReplicantRegistry();

  private readonly _replicantClasses = new Map<string, ReplicantClass<any>>();

  register(replicantClass: ReplicantClass<any>) {
    this._replicantClasses.set(replicantClass.name, replicantClass);
  }

  get(name: string): ReplicantClass<any> {
    return this._replicantClasses.get(name)!;
  }
}
