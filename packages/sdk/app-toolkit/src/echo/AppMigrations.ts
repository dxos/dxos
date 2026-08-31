//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type Migration, Migrations } from '@dxos/migrations';

/**
 * Namespace the migration version is recorded under. Profiles predating the version annotation
 * store it as a `<namespace>.version` property, so this value cannot change without stranding them.
 */
export const NAMESPACE = 'composer.dxos.org';

/**
 * The app's schema migration history, newest last.
 *
 * NOTE: When removing migrations, consider state of space properties which store the version keys
 * of latest migration.
 */
export const MIGRATIONS: Migration[] = [
  {
    version: '2024-06-10-collections',
    next: async () => {},
  },
  {
    version: '2024-06-12/fully-qualified-typenames',
    next: async () => {},
  },
];

/**
 * Register {@link MIGRATIONS} with the global registry.
 *
 * Every host that can create a space must call this during boot, before an identity exists:
 * `Migrations.targetVersion` is what stamps a newly created space as already migrated, and a space
 * created without it is reported as pending migration by every host that does register them.
 */
export const define = (): void => Migrations.define(NAMESPACE, MIGRATIONS);
