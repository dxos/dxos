//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import * as AppSettings from '@dxos/app-toolkit/AppSettings';
import { type Space } from '@dxos/client/echo';
import { Annotation, Database, Filter, Obj, Ref } from '@dxos/echo';

/**
 * The one {@link AppSettings.AppSettings} every device writes through, named on the settings space's
 * `properties` — the same mechanism the root collection uses.
 *
 * A query cannot settle this on its own: it does not subscribe, so two devices that both run before
 * replication each find nothing, each create, and each keep what they made. The annotation gives the
 * account one answer, and {@link Canonical.follow} is what makes a device adopt it.
 */
export class Canonical {
  #settings: AppSettings.AppSettings;

  private constructor(
    private readonly _space: Space,
    settings: AppSettings.AppSettings,
  ) {
    this.#settings = settings;
  }

  /**
   * Resolve the canonical object, naming it if the account has not yet.
   *
   * The lowest id wins among objects the annotation does not cover, which is what converges a profile
   * that already duplicated before this annotation existed.
   */
  static resolve = Effect.fnUntraced(function* (space: Space) {
    const named = Annotation.get(space.properties, AppAnnotation.AppSettingsAnnotation).pipe(Option.getOrUndefined);
    if (named) {
      return new Canonical(space, yield* Database.load(named));
    }

    const existing = yield* Effect.promise(() => space.db.query(Filter.type(AppSettings.AppSettings)).run());
    const settings =
      [...existing].sort((left, right) => left.id.localeCompare(right.id))[0] ?? space.db.add(AppSettings.make());
    Obj.update(space.properties, (properties) => {
      Annotation.set(properties, AppAnnotation.AppSettingsAnnotation, Ref.make(settings));
    });

    return new Canonical(space, settings);
  });

  /** The object in effect. Read on every access: {@link follow} can repoint it mid-session. */
  get settings(): AppSettings.AppSettings {
    return this.#settings;
  }

  /**
   * Adopt the account's answer when it names an object other than the one in hand, folding what was
   * written here into it first, and report whether anything moved.
   *
   * Both devices write the annotation, so one of the two writes loses. The losing device is the one
   * holding settings nobody else can see, which is why the merge runs before the repoint.
   */
  follow = Effect.fnUntraced(function* (this: Canonical) {
    const named = Annotation.get(this._space.properties, AppAnnotation.AppSettingsAnnotation).pipe(
      Option.getOrUndefined,
    );
    if (!named) {
      return false;
    }

    const winner = yield* Database.load(named);
    const loser = this.#settings;
    if (winner.id === loser.id) {
      return false;
    }

    Obj.update(winner, (winner) => {
      AppSettings.mergeShared(winner.shared, Obj.getSnapshot(loser).shared);
    });
    this.#settings = winner;

    return true;
  });
}
