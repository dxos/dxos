#!/usr/bin/env bun
//
// Copyright 2026 DXOS.org
//

// Fails when CI cannot publish a publishable workspace package to npm.
//
// `publish-all.yml` publishes through npm trusted publishing (OIDC). A package that was never published,
// or whose trusted publisher is not configured, fails with ENEEDAUTH mid-publish, after the others have
// shipped, leaving a partial release. The publish workflow runs this first so the run stops before
// building anything.
//
// Everywhere, it checks that each package exists on the registry. Inside GitHub Actions with
// `id-token: write` it also performs the same OIDC token exchange `npm publish` does, which succeeds
// only when the package's trusted publisher matches the calling workflow; it publishes nothing. Run
// from `publish-all.yml`, since npm matches the trusted publisher against the workflow filename.
//
// Usage: bun scripts/check-packages-published.ts

import { readFile } from 'node:fs/promises';

const NPM_REGISTRY = 'https://registry.npmjs.org';
const CONCURRENCY = 16;
const RETRIES = 2;
const REQUEST_TIMEOUT_MS = 10_000;

const PATTERNS = ['{packages,tools,vendor}/**/package.json', 'docs/package.json'];
const IGNORED = /(^|\/)(node_modules|__fixtures__|dist|build|out)\//;

type PublicPackage = { name: string; file: string };

type Problem = PublicPackage & { reason: 'unpublished' | 'untrusted' };

const findPublicPackages = async (): Promise<PublicPackage[]> => {
  const packages: PublicPackage[] = [];
  for (const pattern of PATTERNS) {
    for await (const file of new Bun.Glob(pattern).scan({ onlyFiles: true })) {
      if (IGNORED.test(file)) {
        continue;
      }

      let manifest: { name?: string; private?: boolean };
      try {
        manifest = JSON.parse(await readFile(file, 'utf8'));
      } catch {
        // Fixture and template manifests need not be valid JSON; none of them is published.
        continue;
      }

      if (manifest.name && !manifest.private) {
        packages.push({ name: manifest.name, file });
      }
    }
  }

  return packages;
};

/**
 * Sends a request, retrying a dropped connection, timeout or 5xx; any other status is the answer.
 */
const request = async (url: string, init: RequestInit = {}): Promise<Response> => {
  for (let attempt = 0; ; attempt++) {
    let failure: string;
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      if (response.status < 500) {
        return response;
      }
      failure = `unexpected status ${response.status}`;
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
    }
    if (attempt >= RETRIES) {
      throw new Error(`${failure} fetching ${url}`);
    }
  }
};

const isPublished = async (name: string): Promise<boolean> => {
  const response = await request(`${NPM_REGISTRY}/${encodeURIComponent(name)}`, { method: 'HEAD' });
  if (response.status === 404) {
    return false;
  }
  if (!response.ok) {
    throw new Error(`unexpected status ${response.status} looking up ${name}`);
  }
  return true;
};

// GitHub's OIDC request credentials exist only in a job granted `id-token: write`.
const oidcRequest =
  process.env.ACTIONS_ID_TOKEN_REQUEST_URL && process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN
    ? { url: process.env.ACTIONS_ID_TOKEN_REQUEST_URL, token: process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN }
    : undefined;

/**
 * Mirrors npm's own OIDC flow (`lib/utils/oidc.js`): a fresh GitHub ID token per package, exchanged for a
 * short-lived npm token that is discarded; npm refuses the exchange when no matching trusted publisher exists.
 */
const isTrusted = async (name: string, oidc: { url: string; token: string }): Promise<boolean> => {
  const idTokenUrl = new URL(oidc.url);
  idTokenUrl.searchParams.append('audience', `npm:${new URL(NPM_REGISTRY).hostname}`);
  const idTokenResponse = await request(idTokenUrl.href, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${oidc.token}` },
  });
  const { value: idToken } = (await idTokenResponse.json()) as { value?: string };
  if (!idTokenResponse.ok || !idToken) {
    throw new Error(`GitHub refused an OIDC ID token (status ${idTokenResponse.status})`);
  }

  const escapedName = name.replace('/', '%2f');
  const exchange = await request(`${NPM_REGISTRY}/-/npm/v1/oidc/token/exchange/package/${escapedName}`, {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: `Bearer ${idToken}` },
  });
  return exchange.ok && Boolean(((await exchange.json()) as { token?: string }).token);
};

const packages = await findPublicPackages();
const problems: Problem[] = [];
let cursor = 0;
const worker = async () => {
  while (cursor < packages.length) {
    const entry = packages[cursor++];
    if (!(await isPublished(entry.name))) {
      problems.push({ ...entry, reason: 'unpublished' });
    } else if (oidcRequest && !(await isTrusted(entry.name, oidcRequest))) {
      problems.push({ ...entry, reason: 'untrusted' });
    }
  }
};

try {
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
} catch (error) {
  console.error(`ERROR: failed to query the npm registry: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}

if (problems.length > 0) {
  console.error('ERROR: CI cannot publish these packages to npm:');
  console.error('');
  for (const { name, file, reason } of problems.sort((a, b) => a.name.localeCompare(b.name))) {
    const why = reason === 'unpublished' ? 'never published' : 'no trusted publisher for publish-all.yml';
    console.error(`  ${name} (${file}): ${why}`);
  }
  console.error('');
  console.error('Run `node scripts/publish-package.mjs <name> --trust` for each (see the npm-publishing skill); it');
  console.error('publishes a missing package and configures its trusted publisher. Or mark it `"private": true`.');
  process.exit(1);
}

const scope = oidcRequest
  ? 'published and trust publish-all.yml'
  : 'published (trusted publishers not checked outside CI)';
console.log(`OK: all ${packages.length} publishable packages are ${scope}.`);
