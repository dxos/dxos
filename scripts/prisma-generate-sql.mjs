//
// Copyright 2026 DXOS.org
//

/**
 * Generates a package's initial SQLite migration from its prisma schema, and checks that the
 * committed migrations still describe what the schema says.
 *
 * Prisma is used here as a schema-authoring and DDL-generation tool only: `migrate diff` needs no
 * live database and no `generator client` block, so `@prisma/client` and the query engine never
 * reach the runtime. That is what keeps the browser (wa-sqlite over OPFS) path viable. Runtime
 * queries stay on `@effect/sql`.
 *
 * Migrations are immutable once written: they are recorded in a migrations table and never re-run,
 * so regenerating one would diverge from what deployed databases already applied. Only
 * `0001_init.sql` is ever written, and only when no migration exists yet.
 *
 * Because of that, editing `schema.prisma` produces no SQL by itself, and the two could silently
 * diverge — leaving the schema as documentation that lies. So on every run the migrations are
 * replayed into an in-memory database and compared against the schema prisma currently describes.
 * A mismatch fails the build, which is what forces a schema change to come with a migration.
 *
 * Run via `moon run <package>:prisma` (see .moon/tasks/tag-prisma.yml).
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const SCHEMA_PATH = resolve('prisma/schema.prisma');
const MIGRATIONS_DIR = resolve('src/migrations');
const INITIAL_PATH = join(MIGRATIONS_DIR, '0001_init.sql');

const HEADER = `--
-- Generated from prisma/schema.prisma by scripts/prisma-generate-sql.mjs.
--
-- This migration is immutable: it is recorded in the migrations table and never re-run, so
-- editing it would diverge from databases that already applied it. Add a new numbered
-- migration instead.
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

/**
 * The physical shape SQLite ends up with, so two scripts can be compared by what they produce
 * rather than by their text. Prisma quotes identifiers, names foreign keys, and orders statements
 * differently from hand-written DDL, none of which is a real difference.
 */
const describe = (script) => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(script);
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .all();
    return Object.fromEntries(
      tables.map(({ name }) => [
        name,
        {
          columns: db
            .prepare(`PRAGMA table_info("${name}")`)
            .all()
            .map((column) => `${column.name} ${column.type}${column.notnull ? ' NOT NULL' : ''}`),
          indexes: db
            .prepare(`PRAGMA index_list("${name}")`)
            .all()
            .filter((index) => !index.name.startsWith('sqlite_'))
            .map((index) => `${index.name}${index.unique ? ' UNIQUE' : ''}`)
            .sort(),
        },
      ]),
    );
  } finally {
    db.close();
  }
};

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
  console.error('prisma migrate diff produced no DDL; refusing to write a migration');
  process.exit(1);
}

const schema = makeIdempotent(generated).trimEnd() + '\n';
mkdirSync(MIGRATIONS_DIR, { recursive: true });

const migrations = readdirSync(MIGRATIONS_DIR)
  .filter((entry) => /^\d+_.*\.sql$/.test(entry))
  .sort();

if (migrations.length === 0) {
  writeFileSync(INITIAL_PATH, HEADER + schema);
  console.log(`Wrote ${relative(process.cwd(), INITIAL_PATH)}`);
  process.exit(0);
}

const replayed = describe(migrations.map((entry) => readFileSync(join(MIGRATIONS_DIR, entry), 'utf8')).join('\n'));
const declared = describe(schema);

if (JSON.stringify(replayed) !== JSON.stringify(declared)) {
  const tables = [...new Set([...Object.keys(replayed), ...Object.keys(declared)])].sort();
  console.error(
    `prisma/schema.prisma and src/migrations/ disagree.\n\n` +
      'Migrations are immutable, so a schema change needs a new numbered migration ' +
      '(or the schema needs updating to match one that was hand-written).\n',
  );
  for (const table of tables) {
    const fromMigrations = JSON.stringify(replayed[table] ?? null);
    const fromSchema = JSON.stringify(declared[table] ?? null);
    if (fromMigrations !== fromSchema) {
      console.error(`  ${table}:\n    migrations: ${fromMigrations}\n    schema:     ${fromSchema}`);
    }
  }
  process.exit(1);
}

console.log(`${migrations.length} migration(s) match prisma/schema.prisma.`);
