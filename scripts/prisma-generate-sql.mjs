//
// Copyright 2026 DXOS.org
//

/**
 * Generates the initial SQLite migration from a package's prisma schema.
 *
 * Prisma is used here as a schema-authoring and DDL-generation tool only: `migrate diff`
 * needs no live database and no `generator client` block, so `@prisma/client` and the query
 * engine never reach the runtime. That is what keeps the browser (wa-sqlite over OPFS) path
 * viable. Runtime queries stay on `@effect/sql`.
 *
 * Migrations are immutable once written: they are recorded in a migrations table and never
 * re-run, so regenerating one would silently diverge from what deployed databases already
 * applied. This script therefore only ever writes `0001_init.sql`, and only when no migration
 * exists yet — it will not overwrite. Subsequent schema changes are added as new numbered files
 * alongside an updated `schema.prisma`.
 *
 * Run via `moon run <package>:prisma` (see .moon/tasks/tag-prisma.yml).
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const SCHEMA_PATH = resolve('prisma/schema.prisma');
const MIGRATIONS_DIR = resolve('src/migrations');
const INITIAL_PATH = resolve(MIGRATIONS_DIR, '0001_init.sql');
const SNAPSHOT_PATH = resolve(MIGRATIONS_DIR, 'snapshot.sql');

const HEADER = `--
-- Generated from prisma/schema.prisma by scripts/prisma-generate-sql.mjs.
--
-- This migration is immutable: it is recorded in the migrations table and never re-run, so
-- editing it would diverge from databases that already applied it. Add a new numbered
-- migration instead.
--
`;

const SNAPSHOT_HEADER = `--
-- Generated from prisma/schema.prisma by scripts/prisma-generate-sql.mjs. Do not edit.
--
-- Not a migration and never applied to a real database. This is the schema prisma currently
-- describes, kept so a test can assert that replaying the migrations reproduces it. Without it,
-- editing schema.prisma would silently diverge from the migration chain, since migrations are
-- frozen once written.
--
`;

/**
 * Rewrites Prisma's bare \`CREATE\` statements to be idempotent, so the initial migration can be
 * stamped onto a database created before migration tracking existed without failing.
 */
const makeIdempotent = (sql) =>
  sql
    .replace(/\bCREATE TABLE (?!IF NOT EXISTS)/g, 'CREATE TABLE IF NOT EXISTS ')
    .replace(
      /\bCREATE (UNIQUE )?INDEX (?!IF NOT EXISTS)/g,
      (_match, unique) => `CREATE ${unique ?? ''}INDEX IF NOT EXISTS `,
    );

if (!existsSync(SCHEMA_PATH)) {
  console.error(`No prisma schema at ${relative(process.cwd(), SCHEMA_PATH)}`);
  process.exit(1);
}

// `--to-schema-datamodel` is the 6.x flag name; prisma 7 renamed it to `--to-schema`.
const generated = execFileSync(
  'pnpm',
  ['exec', 'prisma', 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', SCHEMA_PATH, '--script'],
  // The update banner is written on every invocation and would otherwise appear in CI logs.
  { encoding: 'utf8', env: { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: '1' } },
);

if (!/CREATE TABLE/i.test(generated)) {
  console.error('prisma migrate diff produced no DDL; refusing to overwrite committed SQL');
  process.exit(1);
}

const schema = makeIdempotent(generated).trimEnd() + '\n';
mkdirSync(MIGRATIONS_DIR, { recursive: true });

// The snapshot always tracks the current schema; it is a drift oracle, not a migration.
writeFileSync(SNAPSHOT_PATH, SNAPSHOT_HEADER + schema);

const migrations = readdirSync(MIGRATIONS_DIR).filter((entry) => entry.endsWith('.sql') && entry !== 'snapshot.sql');
if (migrations.length > 0) {
  console.log(
    `${migrations.length} migration(s) already present; they are immutable and were left alone. ` +
      'Add a new numbered .sql file for schema changes — the snapshot test will fail until you do.',
  );
  process.exit(0);
}

writeFileSync(INITIAL_PATH, HEADER + schema);
console.log(`Wrote ${relative(process.cwd(), INITIAL_PATH)}`);
