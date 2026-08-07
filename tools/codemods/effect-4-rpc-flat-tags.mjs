#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//
// Rewrites effect-rpc client calls from the nested form to the flat rpc tag.
//
// Effect 3's `RpcClient` split a dotted rpc tag on the prefix and nested the client object, so
// `IdentityService.queryIdentity` was reachable as `client.IdentityService.queryIdentity`. Effect 4
// keys the client by the whole tag, so the same call is `client['IdentityService.queryIdentity']`.
//
// The deprecated `ClientServicesProvider.services` map is keyed by service name and holds the
// protobuf-shaped interfaces, whose methods are genuinely nested -- so a receiver ending in
// `.services` is left alone. Everything else on these names is an effect-rpc client.
//
//   node tools/codemods/effect-4-rpc-flat-tags.mjs [--dry] [path...]
//

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const SERVICES = [
  'SystemService',
  'NetworkService',
  'LoggingService',
  'IdentityService',
  'InvitationsService',
  'DevicesService',
  'SpacesService',
  'DataService',
  'QueryService',
  'FeedService',
  'ContactsService',
  'EdgeAgentService',
  'DevtoolsHost',
  'WorkerService',
];

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const paths = args.filter((arg) => arg !== '--dry');

const pattern = new RegExp(
  String.raw`(?<![\w$])(services|[\w$\]'"]+)(\??\.)(${SERVICES.join('|')})\.([a-z][\w$]*)`,
  'g',
);

const files = execFileSync(
  'grep',
  [
    '-rlE',
    `\\.(${SERVICES.join('|')})\\.[a-z]`,
    '--include=*.ts',
    '--include=*.tsx',
    ...(paths.length ? paths : ['packages', 'tools']),
  ],
  { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 },
)
  .split('\n')
  .filter((file) => file && !file.includes('/dist/'));

let changedFiles = 0;
let rewritten = 0;
let skipped = 0;

for (const file of files) {
  const before = readFileSync(file, 'utf-8');
  const source = before.replace(pattern, (match, receiver, access, service, method) => {
    if (receiver === 'services') {
      skipped += 1;
      return match;
    }
    rewritten += 1;
    return `${receiver}${access.endsWith('?.') ? '?.' : ''}['${service}.${method}']`;
  });

  if (source !== before) {
    changedFiles += 1;
    if (!dry) {
      writeFileSync(file, source);
    }
  }
}

console.log(
  `${dry ? '[dry] ' : ''}${changedFiles} files; ${rewritten} rewritten, ${skipped} left on the deprecated services map`,
);
