//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as Operation from '@dxos/compute/Operation';
import type * as Process from '@dxos/compute/Process';
import { Check } from '@dxos/permission';

/**
 * Decides whether an authority admits an operation that declares requirements; refuses by dying with
 * `Operation.OperationDeniedError`. The process manager checks every call a process makes against each authority the
 * process is held to.
 */
export interface Api {
  readonly check: (params: {
    readonly authority: Process.Authority;
    readonly op: Operation.Definition.Any;
    readonly input: unknown;
  }) => Effect.Effect<void>;
}

export class Service extends Context.Service<Service, Api>()('@dxos/compute-runtime/Verifier') {}

export type Options = {
  /**
   * The runtime's live facts: revocations, space memberships, recorded consents, and grants it holds itself. Consulted
   * beside the process's own grants.
   */
  readonly source?: Check.GrantSource;
};

/**
 * Checks each requirement the operation declares against the authority's grants. Those grants were placed on the
 * process by the host that spawned it or added through `ProcessManager.grant`, which the runtime vouches for, so each
 * issuer roots its own grant; chains among them are still checked.
 */
export const make = ({ source }: Options = {}): Api => ({
  check: Effect.fnUntraced(function* ({ authority, op, input }) {
    const held = Check.fromGrants({
      grants: authority.grants,
      trusted: [...new Set(authority.grants.map((grant) => grant.issuer))],
    });
    const grants = source ? Check.merge(held, source) : held;
    for (const requirement of Operation.getRequirements(op)) {
      const result = yield* Check.check({ principal: authority.principal, requirement, args: input, source: grants });
      if (Check.isDenied(result)) {
        return yield* Effect.die(
          new Operation.OperationDeniedError({
            message: `Operation "${op.meta.key}" denied: ${Check.describeReason(result.reason)}`,
            context: { key: op.meta.key, command: requirement.command, reason: result.reason.kind },
          }),
        );
      }
    }
  }),
});

export const layer = (options?: Options): Layer.Layer<Service> => Layer.succeed(Service, make(options));
