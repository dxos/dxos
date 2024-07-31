//
// Copyright 2023 DXOS.org
//

import { type Space, create, SpaceState } from '@dxos/client/echo';
import { invariant } from '@dxos/invariant';
import { type MaybePromise } from '@dxos/util';

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
  private static _state = create<{ running: string[] }>({ running: [] });

  static get versionProperty() {
    return this.namespace && `${this.namespace}.version`;
  }

  static get targetVersion() {
    return this.migrations[this.migrations.length - 1].version;
  }

  static running(space: Space) {
    return this._state.running.includes(space.key.toHex());
  }

  static define(namespace: string, migrations: Migration[]) {
    this.namespace = namespace;
    this.migrations = migrations;
  }

  static async migrate(space: Space, targetVersion?: string | number) {
    invariant(!this.running(space), 'Migration already running');
    invariant(this.versionProperty, 'Migrations namespace not set');
    invariant(space.state.get() === SpaceState.SPACE_READY, 'Space not ready');
    const currentVersion = space.properties[this.versionProperty];
    const currentIndex = this.migrations.findIndex((m) => m.version === currentVersion) + 1;
    const i = this.migrations.findIndex((m) => m.version === targetVersion);
    const targetIndex = i === -1 ? this.migrations.length : i + 1;
    if (currentIndex === targetIndex) {
      return false;
    }

    this._state.running.push(space.key.toHex());
    if (targetIndex > currentIndex) {
      const migrations = this.migrations.slice(currentIndex, targetIndex);
      for (const migration of migrations) {
        const builder = new MigrationBuilder(space);
        await migration.next({ space, builder });
        builder.changeProperties((propertiesStructure) => {
          invariant(this.versionProperty, 'Migrations namespace not set');
          propertiesStructure.data[this.versionProperty] = migration.version;
        });
        await builder._commit();
      }
    }
    this._state.running.splice(this._state.running.indexOf(space.key.toHex()), 1);

    return true;
  }
}
