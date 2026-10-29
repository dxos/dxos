//
// Copyright 2023 DXOS.org
//

import * as Option from 'effect/Option';
import * as Atom from 'effect/reactivity/Atom';
import * as AtomRegistry from 'effect/reactivity/AtomRegistry';

import { type Space, SpaceState } from '@dxos/client/echo';
import { Annotation, type Migration as EchoMigration, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { MigrationVersionAnnotation } from './annotations.ts';

/**
 * One version step of a space's migration history.
 */
export type Migration = {
  version: string;
  /** Run in order by `db.runMigrations`; empty for a step that only records the version. */
  migrations: readonly EchoMigration.Migration[];
};

export class Migrations {
  static namespace?: string;
  static migrations: Migration[] = [];
  private static _registry = AtomRegistry.make();
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
          await space.db.runMigrations([...migration.migrations]);
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
