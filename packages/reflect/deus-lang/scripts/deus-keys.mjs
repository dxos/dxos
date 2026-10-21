#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Manages the DEUS Worker's API keys (D164) straight in its D1 database through wrangler, so it
// needs a Cloudflare token for the account (CLOUDFLARE_API_TOKEN) rather than an admin key; it is
// also how the first key is made. The Worker's /v1/keys does the same for an admin key.
//
//   node scripts/deus-keys.mjs new --label <text> --scopes push,site [--projects toolchain] [--days n] [--out file]
//   node scripts/deus-keys.mjs list
//   node scripts/deus-keys.mjs grant <id> <project…>   (adds projects: @owner/project or @owner/*)
//   node scripts/deus-keys.mjs revoke <id>
//
// A new key is printed once (or written to --out, readable only by its owner); only its hash is kept.

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';

import { isGrantable } from '../platform/worker/address.mjs';
import { SCOPES, mintKey } from '../platform/worker/remote.mjs';

const workerDir = join(dirname(import.meta.dirname), 'platform/worker');
const wrangler = join(
  execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim(),
  'node_modules/.bin/wrangler',
);

const sql = (command) => {
  const out = execFileSync(wrangler, ['d1', 'execute', 'deus-auth', '--remote', '--json', '--command', command], {
    cwd: workerDir,
    encoding: 'utf8',
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: '1' },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  return JSON.parse(out)[0].results;
};

/** A value as an SQL literal; keys are only ever made of these, so no statement is built from raw input. */
const literal = (value) =>
  value === null ? 'null' : typeof value === 'number' ? String(value) : `'${String(value).replace(/'/g, "''")}'`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    label: { type: 'string' },
    scopes: { type: 'string' },
    projects: { type: 'string' },
    days: { type: 'string' },
    out: { type: 'string' },
  },
});

const [command, ...rest] = positionals;
if (command === 'new') {
  const scopes = (values.scopes ?? '').split(',').filter(Boolean);
  if (!values.label || scopes.length === 0 || !scopes.every((scope) => SCOPES.includes(scope))) {
    throw new Error(
      `usage: new --label <text> --scopes <${SCOPES.join('|')},…> [--projects a,b] [--days n] [--out file]`,
    );
  }
  const projects = values.projects ? values.projects.split(',') : '*';
  const minted = await mintKey();
  const now = Date.now();
  const expires = values.days ? now + Number(values.days) * 24 * 3600 * 1000 : null;
  sql(
    `insert into api_keys (id, secret_hash, label, scopes, projects, created_at, expires_at) values (${[
      minted.id,
      minted.secretHash,
      values.label,
      JSON.stringify(scopes),
      JSON.stringify(projects),
      now,
      expires,
    ]
      .map(literal)
      .join(', ')})`,
  );
  if (values.out) {
    writeFileSync(values.out, `${minted.key}\n`, { mode: 0o600 });
    console.log(`Key ${minted.id} (${scopes.join(',')}) written to ${values.out}.`);
  } else {
    console.log(minted.key);
  }
} else if (command === 'list') {
  for (const row of sql(
    'select id, label, scopes, projects, created_at, expires_at, revoked_at, last_used_at from api_keys order by created_at',
  )) {
    const state = row.revoked_at ? 'revoked' : row.expires_at && row.expires_at < Date.now() ? 'expired' : 'active';
    const used = row.last_used_at ? new Date(row.last_used_at).toISOString() : 'never';
    console.log(`${row.id}  ${state.padEnd(7)}  ${row.scopes}  ${row.projects}  used ${used}  ${row.label}`);
  }
} else if (command === 'grant' && rest.length >= 2 && /^[0-9a-f]{16}$/.test(rest[0])) {
  const [id, ...added] = rest;
  if (!added.every(isGrantable)) {
    throw new Error('a project is @owner/project or @owner/*');
  }
  const [row] = sql(`select projects from api_keys where id = ${literal(id)}`);
  if (!row) {
    throw new Error(`no key ${id}`);
  }
  const current = JSON.parse(row.projects);
  if (current === '*') {
    console.log(`${id} already reaches every project.`);
  } else {
    const projects = [...new Set([...current, ...added])];
    sql(`update api_keys set projects = ${literal(JSON.stringify(projects))} where id = ${literal(id)}`);
    console.log(`${id} now reaches ${projects.join(', ')}.`);
  }
} else if (command === 'revoke' && rest.length === 1 && /^[0-9a-f]{16}$/.test(rest[0])) {
  sql(`update api_keys set revoked_at = ${Date.now()} where id = ${literal(rest[0])}`);
  console.log(`Revoked ${rest[0]}.`);
} else {
  throw new Error('usage: deus-keys.mjs new|list|grant <id> <project…>|revoke <id>');
}
