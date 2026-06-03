//
// Copyright 2023 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import * as Registry from '@effect-atom/atom/Registry';
import * as Option from 'effect/Option';

import { type Space, SpaceState } from '@dxos/client/echo';
import { Annotation, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { type MaybePromise } from '@dxos/util';

import { MigrationVersionAnnotation } from './annotations';
import { MigrationBuilder } from './migration-builder';

export type MigrationContext = {
  space: Space;
  builder: MigrationBuilder;
};

export type Migration = {
  version: string;
  next: (context: MigrationContext) => MaybePromise<void>;
};

export class Migrations {
  static namespace?: string;
  static migrations: Migration[] = [];
  private static _registry = Registry.make();
  private static _stateAtom = Atom.make<{ running: string[] }>({ running: [] }).pipe(Atom.keepAlive);

  /**
   * @deprecated Use `MigrationVersionAnnotation` via `Annotation.get/set` on space properties.
   */
  static get versionProperty() {
    return this.namespace && `${this.namespace}.version`;
  }

  static get targetVersion() {
    return this.migrations[this.migrations.length - 1]?.version;
  }

  static running(space: Space): boolean {
    const state = this._registry.get(this._stateAtom);
    return state.running.includes(space.key.toHex());
  }

  static define(namespace: string, migrations: Migration[]): void {
    this.namespace = namespace;
    this.migrations = migrations;
  }

  static async migrate(space: Space, targetVersion?: string | number): Promise<boolean> {
    invariant(!this.running(space), 'Migration already running');
    invariant(space.state.get() === SpaceState.SPACE_READY, 'Space not ready');
    const currentVersion = Annotation.get(space.properties, MigrationVersionAnnotation).pipe(Option.getOrUndefined);
    const currentIndex = this.migrations.findIndex((m) => m.version === currentVersion) + 1;
    const i = this.migrations.findIndex((m) => m.version === targetVersion);
    const targetIndex = i === -1 ? this.migrations.length : i + 1;
    if (currentIndex === targetIndex) {
      return false;
    }

    const spaceKey = space.key.toHex();
    const currentState = this._registry.get(this._stateAtom);
    this._registry.set(this._stateAtom, { running: [...currentState.running, spaceKey] });
    try {
      if (targetIndex > currentIndex) {
        const migrations = this.migrations.slice(currentIndex, targetIndex);
        for (const migration of migrations) {
          const builder = new MigrationBuilder(space);
          await migration.next({ space, builder });
          await builder._commit();
          Obj.update(space.properties, (properties) => {
            Annotation.set(properties, MigrationVersionAnnotation, migration.version);
          });
        }
      }
    } finally {
      const finalState = this._registry.get(this._stateAtom);
      this._registry.set(this._stateAtom, { running: finalState.running.filter((key) => key !== spaceKey) });
    }

    return true;
  }
}
