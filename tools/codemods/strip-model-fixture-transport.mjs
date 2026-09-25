//
// Copyright 2026 DXOS.org
//

// Strips the provider HTTP transport envelopes from already-committed model fixtures: `request`
// (method, url, request headers) on `response-metadata` parts and `response` (status, response
// headers) on `finish` parts. They carry account and trace identifiers (`anthropic-organization-id`,
// `anthropic-workspace-id`, `cf-ray`, `request-id`, `traceparent`/`b3`) plus per-request rate-limit
// state, none of which replay reads — `LanguageModelFixture` now drops them at the serialization
// boundary, and this rewrites the records taken before it did.
//
// Fixtures are keyed on `parameters` + `prompt`, so removing response fields cannot change a hash:
// the file names stay put and replay is unaffected.
//
// Usage:
//   node tools/codemods/strip-model-fixture-transport.mjs [store-dir]

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] ?? '.store/conversations';

const TRANSPORT_FIELDS = ['request', 'response'];

const jsonFiles = function* (dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* jsonFiles(path);
    } else if (entry.name.endsWith('.json')) {
      yield path;
    }
  }
};

let changedFiles = 0;
let strippedParts = 0;
for (const file of jsonFiles(root)) {
  const conversation = JSON.parse(readFileSync(file, 'utf8'));
  let changed = false;
  for (const part of conversation.response ?? []) {
    if (part === null || typeof part !== 'object' || Array.isArray(part)) {
      continue;
    }
    if (!TRANSPORT_FIELDS.some((field) => field in part)) {
      continue;
    }
    for (const field of TRANSPORT_FIELDS) {
      delete part[field];
    }
    changed = true;
    strippedParts++;
  }
  if (changed) {
    // Compact JSON, matching `encodeConversation` — the store is `linguist-generated` and never
    // pretty-printed, so re-serializing must not reflow it into a diff.
    writeFileSync(file, JSON.stringify(conversation));
    changedFiles++;
  }
}

console.log(`Stripped ${strippedParts} transport envelope(s) across ${changedFiles} file(s) under ${root}.`);
