//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import type * as AppSettings from '@dxos/app-toolkit/AppSettings';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Annotation, Obj } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';

import { resolveAppSettings, resolveSettingsSpace } from '../../util/index.ts';

export type SettingsTargetEvents = {
  /** The current settings object changed. */
  onChange: () => void;
  /** The target moved to another settings object, which may hold values this device never saw. */
  onSwitch: () => void;
};

/**
 * The settings object this device reads and writes: the one the settings space names. It follows the
 * name to another object, and follows the profile to another space when {@link AppSpace.getSettingsSpace}
 * resolves one (a credential arriving, or naming another space), so writes reach the object every
 * device converges on.
 */
export class SettingsTarget {
  static readonly open = Effect.fnUntraced(function* (client: Client) {
    const space = yield* resolveSettingsSpace(client);
    return new SettingsTarget(client, space, yield* resolveAppSettings(space));
  });

  readonly #client: Client;
  #space: Space;
  #settings: AppSettings.AppSettings;

  private constructor(client: Client, space: Space, settings: AppSettings.AppSettings) {
    this.#client = client;
    this.#space = space;
    this.#settings = settings;
  }

  get space(): Space {
    return this.#space;
  }

  get current(): AppSettings.AppSettings {
    return this.#settings;
  }

  /** Start following; returns the function that stops it. */
  follow(events: SettingsTargetEvents): () => void {
    let disposed = false;
    let unsubscribeProperties = () => {};
    let unsubscribeSettings = () => {};

    const bind = (space: Space, settings: AppSettings.AppSettings) => {
      unsubscribeProperties();
      unsubscribeSettings();
      this.#space = space;
      this.#settings = settings;
      unsubscribeProperties = Obj.subscribe(space.properties, followName);
      unsubscribeSettings = Obj.subscribe(settings, () => (Obj.isDeleted(settings) ? followName() : events.onChange()));
    };

    // Devices that each created an object settle on the one the space names, so a device switches
    // to it and reseeds, republishing what only it holds.
    const followName = () => {
      const space = this.#space;
      const ref = Annotation.get(space.properties, AppAnnotation.AppSettingsAnnotation).pipe(Option.getOrUndefined);
      void ref?.load().then(
        (next) => {
          const named = Annotation.get(space.properties, AppAnnotation.AppSettingsAnnotation).pipe(
            Option.getOrUndefined,
          );
          if (disposed || space !== this.#space || named?.uri !== ref.uri || next.id === this.#settings.id) {
            return;
          }

          bind(space, next);
          events.onSwitch();
        },
        (error) => log.catch(error),
      );
    };

    // One switch runs at a time; once it lands the check runs again, so a change that landed
    // meanwhile is still seen.
    let switching = false;
    const followSpace = () => {
      const next = switching ? undefined : AppSpace.getSettingsSpace(this.#client);
      if (!next || next === this.#space) {
        return;
      }

      switching = true;
      void next
        .waitUntilReady()
        .then(() => EffectEx.runPromise(resolveAppSettings(next)))
        .then(
          (settings) => {
            switching = false;
            if (!disposed) {
              bind(next, settings);
              events.onSwitch();
              followSpace();
            }
          },
          (error) => {
            switching = false;
            log.catch(error);
          },
        );
    };

    bind(this.#space, this.#settings);
    const spaces = this.#client.spaces.subscribe(followSpace);
    const credentials = this.#client.halo.credentials.subscribe(followSpace);
    return () => {
      disposed = true;
      spaces.unsubscribe();
      credentials.unsubscribe();
      unsubscribeProperties();
      unsubscribeSettings();
    };
  }
}
