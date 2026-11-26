//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import type * as Effect from 'effect/Effect';

import type * as Operation from '@dxos/compute/Operation';
import type { Grant, Principal, Requirement } from '@dxos/permission';

/** A call an authority refused for a consentable requirement, put to whoever can approve it. */
export type Request = {
  /** The principal the refusing authority names, which a granted permission is issued to. */
  readonly principal: Principal.Principal;
  readonly requirement: Requirement.Requirement;
  readonly op: Operation.Definition.Any;
  readonly input: unknown;
};

/**
 * The answer: let this one call through, add these grants to the refusing authority (which admits this call and later
 * ones), or refuse it.
 */
export type Answer =
  | { readonly _tag: 'Once' }
  | { readonly _tag: 'Grant'; readonly grants: readonly Grant.Grant[] }
  | { readonly _tag: 'Declined' };

/**
 * Asks someone to approve a call a process's authority refused for a consentable requirement. Resolved per process
 * through the process manager's `ServiceResolver`, so a host contributes it (a chat asks the person in the
 * conversation); a process with none is refused outright.
 */
export interface Api {
  readonly ask: (request: Request) => Effect.Effect<Answer>;
}

export class Service extends Context.Service<Service, Api>()('@dxos/compute-runtime/Consent') {}
