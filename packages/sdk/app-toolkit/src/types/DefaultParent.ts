//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import { type Database, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { Position } from '@dxos/util';

import * as AppCapabilities from '../app-framework/AppCapabilities.ts';
import { TypeOptions } from '../echo/index.ts';
import * as ContainerModel from './ContainerModel.ts';

/**
 * The parent contributed for the object's type tags: matching {@link AppCapabilities.DefaultParent} rules
 * are asked in `position` order and the first parent wins; a rule that fails is logged and skipped.
 * Undefined when no rule applies, including on a host that binds no capability manager (EDGE).
 */
export const resolve = (object: Obj.Unknown): Effect.Effect<Obj.Unknown | undefined, never, Database.Service> =>
  Effect.gen(function* () {
    const manager = yield* Effect.serviceOption(Capability.Service);
    const type = Obj.getType(object);
    if (Option.isNone(manager) || !type) {
      return undefined;
    }

    const rules = manager.value
      .getAll(AppCapabilities.DefaultParent)
      .filter((rule) => TypeOptions.hasUserTypeTag(type, rule.tag))
      .toSorted(Position.compare);
    for (const rule of rules) {
      const parent = yield* rule.resolve(object).pipe(
        Effect.catch((error) =>
          Effect.sync(() => {
            log.warn('default parent rule failed', { tag: rule.tag, error });
            return undefined;
          }),
        ),
      );
      if (parent) {
        return parent;
      }
    }

    return undefined;
  });

type AddProps = {
  object: Obj.Unknown;
  /** The object's parent; absent, {@link resolve} picks one from the type's tags. */
  target?: Obj.Unknown;
};

/** Persists the object and files it under the target, or under its type's default parent when none is given. */
export const add = Effect.fn(function* ({ object, target }: AddProps) {
  yield* ContainerModel.add({ object, target: target ?? (yield* resolve(object)) });
});
