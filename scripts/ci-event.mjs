//
// Copyright 2026 DXOS.org
//

/**
 * Records a CI measurement in PostHog as a product-analytics event.
 *
 *   node scripts/ci-event.mjs --event ci.boot-budget \
 *     --properties packages/apps/composer-app/out/boot-budget.json
 *
 *   node scripts/ci-event.mjs --batch <file.ndjson> --historical
 *
 * Nested objects in the report are flattened one level (`budget.bytes` -> `ciBudgetBytes`) so the
 * properties stay queryable in HogQL without JSONExtract.
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

/** Ingestion host, which is not the app host. Overridable for the US region or a test project. */
const HOST = process.env.DX_POSTHOG_INGEST_HOST ?? 'https://eu.i.posthog.com';

/**
 * One id for every CI event. Person profiles are off (see `$process_person_profile` below), so this
 * never becomes a person; it exists because the capture API requires the field.
 */
const DISTINCT_ID = 'ci';

/**
 * Every property this script sends is namespaced into camelCase, matching the convention the app's
 * own events use (`spaceId`, `subjectId`). The target is Composer's production analytics project,
 * where property definitions are global: unprefixed, `bytes` and `count` would sit in the same
 * autocomplete list as the product's own properties, permanently.
 */
const namespaced = (key) => `ci${key[0].toUpperCase()}${key.slice(1)}`;

const UUID_NAMESPACE = '6f2b1a54-9c3d-4e77-9a1f-0d5c8b7e4a21';

/**
 * PostHog deduplicates on the tuple (uuid, timestamp, event, distinct_id), so a stable uuid only
 * suppresses a rerun's duplicate if the timestamp is stable too — which is why events default to the
 * COMMIT's date rather than the run's.
 *
 * A batch whose entries share a commit would otherwise share a uuid, leaving them separated by
 * timestamp alone; an entry's optional `dedup` discriminator enters the seed to keep them apart. It
 * is a sibling of `timestamp` on the entry rather than one of its properties, so it never ships.
 */
export const uuidV5 = (name) => {
  const namespace = Buffer.from(UUID_NAMESPACE.replaceAll('-', ''), 'hex');
  const hash = createHash('sha1')
    .update(Buffer.concat([namespace, Buffer.from(name, 'utf8')]))
    .digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString('hex');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32)].join('-');
};

/** Committer date of `sha`, or undefined outside a checkout that has the commit. */
export const commitTimestamp = (sha) => {
  try {
    return execFileSync('git', ['show', '-s', '--format=%cI', sha], { encoding: 'utf8' }).trim();
  } catch {
    return undefined;
  }
};

const defined = (record) => Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));

export const ciContext = () => {
  const sha = process.env.GITHUB_SHA;
  return defined({
    commitSha: sha,
    commitShort: sha?.slice(0, 10),
    branch: process.env.GITHUB_REF_NAME,
    repository: process.env.GITHUB_REPOSITORY,
    workflow: process.env.GITHUB_WORKFLOW,
    job: process.env.GITHUB_JOB,
    trigger: process.env.GITHUB_EVENT_NAME,
    runId: process.env.GITHUB_RUN_ID,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT,
    runnerOs: process.env.RUNNER_OS,
    runnerArch: process.env.RUNNER_ARCH,
  });
};

const flattenOnce = (report) => {
  const flat = {};
  for (const [key, value] of Object.entries(report)) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      for (const [innerKey, innerValue] of Object.entries(value)) {
        flat[`${key}${innerKey[0].toUpperCase()}${innerKey.slice(1)}`] = innerValue;
      }
    } else {
      flat[key] = value;
    }
  }
  return flat;
};

const BATCH_SIZE = 100;

/**
 * Posts events to the capture API. `historical` routes them through the migration pipeline, which is
 * required for anything backdated more than a day and wrong for anything else.
 *
 * Returns false when no project token is configured — the case for a local run or a fork PR, where
 * silently doing nothing is correct.
 */
export const captureCiEvents = async (events, { historical = false } = {}) => {
  const apiKey = process.env.DX_POSTHOG_API_KEY;
  if (!apiKey) {
    console.log('::notice::DX_POSTHOG_API_KEY is unset — skipping CI event capture.');
    return false;
  }

  const batch = events.map(({ event, properties, timestamp, dedup }) => {
    const at = timestamp ?? new Date().toISOString();
    return {
      event,
      timestamp: at,
      properties: {
        distinct_id: DISTINCT_ID,
        // Without this every event mints a person, and a person per commit pollutes every
        // person-scoped insight in the project for no gain.
        $process_person_profile: false,
        ...Object.fromEntries(Object.entries(properties).map(([key, value]) => [namespaced(key), value])),
      },
      /**
       * Seeded on the commit AND the resolved timestamp, plus `dedup` where several facts come from
       * one run.
       *
       * The commit alone is not enough: a schedule fires against whatever main happens to be, so two
       * nights with no merge between them measure different deployments under one sha and would
       * share a uuid. The timestamp alone is not enough either: an event dated by its commit — which
       * is what keys `ci.boot-budget` — must survive a rerun onto the same row, and two commits can
       * carry the same committer date. Together, each addresses the other's collision.
       *
       * It is the resolved timestamp rather than the supplied one, so `--timestamp now` seeds on the
       * moment it actually sent rather than dropping out of the seed entirely.
       */
      uuid: uuidV5([event, properties.commitSha, at, dedup].filter((part) => part !== undefined).join('|')),
    };
  });

  for (let offset = 0; offset < batch.length; offset += BATCH_SIZE) {
    const chunk = batch.slice(offset, offset + BATCH_SIZE);
    const response = await fetch(`${HOST}/batch/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(defined({ api_key: apiKey, historical_migration: historical || undefined, batch: chunk })),
    });
    if (!response.ok) {
      throw new Error(`PostHog capture failed: ${response.status} ${await response.text()}`);
    }
  }

  console.log(`captured ${batch.length} event(s): ${[...new Set(batch.map((entry) => entry.event))].join(', ')}`);
  return true;
};

const main = async () => {
  const { values } = parseArgs({
    options: {
      event: { type: 'string' },
      properties: { type: 'string' },
      batch: { type: 'string' },
      property: { type: 'string', multiple: true, default: [] },
      timestamp: { type: 'string' },
      historical: { type: 'boolean', default: false },
    },
  });

  if (values.batch) {
    // The GitHub context is attached here rather than by the producer, same as the single-event
    // path: a plan that writes the batch runs inside the job but has no business reading its
    // environment. An entry's own properties win, so a backfill can carry the context of the run it
    // is replaying rather than the one replaying it.
    const context = ciContext();
    const events = readFileSync(values.batch, 'utf8')
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line))
      .map((entry) => ({ ...entry, properties: { ...context, ...entry.properties } }));
    await captureCiEvents(events, { historical: values.historical });
    return;
  }

  if (!values.event) {
    throw new Error('--event or --batch is required.');
  }

  const report = values.properties ? flattenOnce(JSON.parse(readFileSync(values.properties, 'utf8'))) : {};
  const extra = Object.fromEntries(
    values.property.map((pair) => {
      const index = pair.indexOf('=');
      if (index < 0) {
        throw new Error(`--property expects key=value, got: ${pair}`);
      }
      return [pair.slice(0, index), pair.slice(index + 1)];
    }),
  );

  const context = ciContext();
  const timestamp =
    values.timestamp === 'now'
      ? undefined
      : (values.timestamp ?? (context.commitSha ? commitTimestamp(context.commitSha) : undefined));

  await captureCiEvents([{ event: values.event, timestamp, properties: { ...report, ...context, ...extra } }], {
    historical: values.historical,
  });
};

if (import.meta.filename === process.argv[1]) {
  await main();
}
