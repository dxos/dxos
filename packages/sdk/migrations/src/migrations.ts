//
// Copyright 2023 DXOS.org
//

import { type Space, SpaceState } from '@dxos/client/echo';
import { invariant } from '@dxos/invariant';
import { type MaybePromise } from '@dxos/util';

// TODO(burdon): Merge with successor to serialization mechanism in braneframe/types.

export type MigrationContext = {
  space: Space;
};

export type Migration = {
  version: string | number;
  up: (context: MigrationContext) => MaybePromise<void>;
  down: (context: MigrationContext) => MaybePromise<void>;
};

export class Migrations {
  static namespace?: string;
  static migrations: Migration[] = [];

  static get versionProperty() {
    return this.namespace && `${this.namespace}.version`;
  }

  static get targetVersion() {
    return this.migrations[this.migrations.length - 1].version;
  }

  static define(namespace: string, migrations: Migration[]) {
    this.namespace = namespace;
    this.migrations = migrations;
  }

  // TODO(wittjosiah): Multi-space migrations.
  static async migrate(space: Space, targetVersion?: string | number) {
    invariant(this.versionProperty, 'Migrations namespace not set');
    invariant(space.state.get() === SpaceState.READY, 'Space not ready');
    const currentVersion = space.properties[this.versionProperty];
    const currentIndex = this.migrations.findIndex((m) => m.version === currentVersion) + 1;
    const i = this.migrations.findIndex((m) => m.version === targetVersion);
    const targetIndex = i === -1 ? this.migrations.length : i + 1;
    if (currentIndex === targetIndex) {
      return false;
    }

    if (targetIndex > currentIndex) {
      const migrations = this.migrations.slice(currentIndex, targetIndex);
      for (const migration of migrations) {
        await migration.up({ space });
        space.properties[this.versionProperty] = migration.version;
      }
    } else {
      const migrations = this.migrations.slice(targetIndex, currentIndex);
      migrations.reverse();
      for (const migration of migrations) {
        await migration.down({ space });
        const index = this.migrations.indexOf(migration);
        space.properties[this.versionProperty] = this.migrations[index - 1]?.version;
      }
    }

    return true;
  }
}
