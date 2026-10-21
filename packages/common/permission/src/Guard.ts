//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import type * as Process from '@dxos/compute/Process';

import * as Check from './Check.ts';
import type * as Grant from './Grant.ts';
import type * as Principal from './Principal.ts';
import * as Requirement from './Requirement.ts';

/**
 * Declares what an operation requires of the process that invokes it. An operation that declares
 * nothing is never checked, so permissions stay opt-in per operation.
 */
export const requires = (...requirements: readonly Requirement.Requirement[]) =>
  Operation.annotate(Operation.RequiresAnnotation, requirements);

export type MakeOptions = {
  /** Who the process acts as; the grants it holds name this principal as their audience. */
  principal: Principal.Principal;
  source: Check.GrantSource;
  caller?: Check.Caller;
  now?: () => number;
};

const deny = (op: Operation.Definition.Any, message: string, context: Record<string, unknown>) =>
  Effect.die(new Operation.OperationDeniedError({ message, context: { key: op.meta.key, ...context } }));

/**
 * A process guard that admits an operation when every requirement it declares passes
 * {@link Check.check} against the guard's principal and grant source, with the operation's input
 * as the policy's `.args`.
 */
export const make = ({ principal, source, caller, now = Date.now }: MakeOptions): Process.Guard => ({
  check: Effect.fnUntraced(function* (op: Operation.Definition.Any, input: unknown) {
    for (const declared of Operation.getRequirements(op)) {
      const requirement = Schema.decodeUnknownOption(Requirement.Requirement)(declared);
      if (Option.isNone(requirement)) {
        return yield* deny(op, `Operation "${op.meta.key}" declares a malformed requirement`, {});
      }
      const result = yield* Check.check({
        principal,
        requirement: requirement.value,
        args: input,
        caller,
        source,
        now: now(),
      });
      if (Check.isDenied(result)) {
        return yield* deny(op, `Operation "${op.meta.key}" denied: ${Check.describeReason(result.reason)}`, {
          command: requirement.value.command,
          reason: result.reason.kind,
        });
      }
    }
  }),
});

/**
 * The grants a runtime attests by spawning a process with them: each is its own root, since the
 * runtime that placed them vouches for their issuers. Proof chains among them are still checked.
 */
export const attested = (grants: readonly Grant.Grant[]): Check.GrantSource =>
  Check.fromGrants({ grants, trusted: [...new Set(grants.map((grant) => grant.issuer))] });
