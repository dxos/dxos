#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

//
// Reap what a dead edge-stress run left behind: read one or more `command-trace.jsonl` files,
// collect every space and identity they record, and delete them through the EDGE admin API.
//
// The run's own cleanup handles the normal case, including assertion failures — this exists for
// the runs that never reached it (orchestrator killed, container lost). Ids come from the trace
// (`detail: 'spaceId'` entries and the `fleet` event), which records them the moment they exist.
//
// Usage:
//   DX_HUB_API_KEY=... node scripts/sweep-edge-stress.mjs [--dry-run] [--edge-url URL] <trace.jsonl ...>
//
// With no explicit --edge-url, each trace's own `run` event supplies it. Deletion is enqueued
// server-side (202), so success here means accepted, not gone.
//

import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const urlFlag = args.indexOf('--edge-url');
const edgeUrlOverride = urlFlag >= 0 ? args[urlFlag + 1] : undefined;
const traces = args.filter((arg, index) => !arg.startsWith('--') && (urlFlag < 0 || index !== urlFlag + 1));

if (traces.length === 0) {
  console.error('usage: DX_HUB_API_KEY=... node sweep-edge-stress.mjs [--dry-run] [--edge-url URL] <trace.jsonl ...>');
  process.exit(2);
}

const adminKey = process.env.DX_HUB_API_KEY;
if (!adminKey && !dryRun) {
  console.error('DX_HUB_API_KEY is not set; pass --dry-run to only list what would be deleted.');
  process.exit(2);
}

let failures = 0;
for (const trace of traces) {
  const spaceIds = new Set();
  const identityDids = new Set();
  let edgeUrl = edgeUrlOverride;
  for (const line of readFileSync(trace, 'utf8').split('\n')) {
    if (!line.trim()) {
      continue;
    }
    const entry = JSON.parse(line);
    if (entry.event === 'run' && !edgeUrl) {
      edgeUrl = entry.spec?.edgeUrl;
    }
    if (entry.detail === 'spaceId' && entry.spaceId) {
      spaceIds.add(entry.spaceId);
    }
    if (entry.event === 'fleet') {
      for (const did of entry.identityDids ?? []) {
        identityDids.add(did);
      }
    }
  }

  console.log(`${trace}: edge=${edgeUrl} spaces=${spaceIds.size} identities=${identityDids.size}`);
  if (!edgeUrl) {
    console.error('  no edge url in trace and none given; skipping');
    failures++;
    continue;
  }

  // Spaces before identities: deleting an identity that still owns spaces would orphan them.
  const targets = [
    ...[...spaceIds].map((id) => `/admin/spaces/${id}`),
    ...[...identityDids].map((did) => `/admin/identities/${did}`),
  ];
  for (const path of targets) {
    if (dryRun) {
      console.log(`  would DELETE ${path}`);
      continue;
    }
    try {
      const response = await fetch(new URL(path, edgeUrl), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminKey}` },
      });
      const envelope = await response.json().catch(() => ({}));
      const ok = response.ok && envelope.success !== false;
      console.log(`  ${ok ? 'accepted' : `REFUSED (${response.status})`} DELETE ${path}`);
      if (!ok) {
        failures++;
      }
    } catch (err) {
      console.log(`  FAILED DELETE ${path}: ${err.message}`);
      failures++;
    }
  }
}
process.exit(failures > 0 ? 1 : 0);
