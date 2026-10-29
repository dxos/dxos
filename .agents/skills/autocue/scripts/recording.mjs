//
// Copyright 2026 DXOS.org
//

/**
 * Where and how a take was recorded: the branch it ran from, the Composer and EDGE environments the app talked
 * to, and what the flow's doc comment says about itself. The driver writes it into `timeline.json` on `stop`;
 * the trimmer and `pack.mjs` carry it into the autocue bundle (see FORMAT.md), so a viewer can tell which build
 * a demo shows and an agent can re-run it.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** Hosts the deployed environments serve from; anything on loopback is a local build. */
const ENVIRONMENTS = [
  [/^(localhost|127\.0\.0\.1|\[::1\]|local\.composer\.space)$/, 'local'],
  [/(^|\.)dev\.(dxos\.network|composer\.space)$/, 'dev'],
  [/(^|\.)(preview|main)\.(dxos\.network|composer\.space)$/, 'preview'],
  [/(^|\.)staging\.(dxos\.network|composer\.space)$/, 'staging'],
  [/(^|\.)labs\.composer\.space$/, 'labs'],
  [/(^|\.)(dxos\.network|composer\.space)$/, 'production'],
];

/** The environment a URL belongs to, by its host; `undefined` when the host is not one of ours. */
export const environmentOf = (url) => {
  try {
    const host = new URL(url).hostname;
    return ENVIRONMENTS.find(([pattern]) => pattern.test(host))?.[1];
  } catch {
    return undefined;
  }
};

const git = (cwd, ...args) => {
  const result = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : undefined;
};

/** Branch and commit of the checkout `dir` is in, and whether it had uncommitted changes. */
export const gitInfo = (dir) => {
  const root = git(dir, 'rev-parse', '--show-toplevel');
  if (!root) {
    return {};
  }
  return {
    root,
    branch: git(root, 'rev-parse', '--abbrev-ref', 'HEAD'),
    commit: git(root, 'rev-parse', 'HEAD'),
    dirty: !!git(root, 'status', '--porcelain', '--untracked-files=no'),
    remote: git(root, 'remote', 'get-url', 'origin')
      ?.replace(/^git@github\.com:/, 'https://github.com/')
      // Never publish credentials embedded in the remote (`https://user:token@host/...`).
      .replace(/^(https?:\/\/)[^/@]+@/, '$1')
      .replace(/\.git$/, '')
      // A sandbox proxy remote (`http://local_proxy@127.0.0.1:port/git/<owner>/<repo>`) names the repo last.
      .replace(/^https?:\/\/[^/]*127\.0\.0\.1[^/]*\/git\//, 'https://github.com/'),
  };
};

/**
 * The doc comment that opens a flow (see SKILL.md "Flow metadata"): its first paragraph is the demo's title and
 * description, and its tags say what it was written from. `@prompt` may run over several lines.
 */
export const flowDoc = (file) => {
  if (!file || !existsSync(file)) {
    return {};
  }
  const comment = readFileSync(file, 'utf8').match(/\/\*\*([\s\S]*?)\*\//)?.[1];
  if (!comment) {
    return {};
  }
  const lines = comment.split('\n').map((line) => line.replace(/^\s*\* ?/, ''));
  const tags = {};
  const prose = [];
  let current;
  let tagged = false;
  for (const line of lines) {
    const tag = line.match(/^@(\w+)\s*(.*)$/);
    if (tag) {
      current = tag[1];
      tagged = true;
      tags[current] = tag[2];
    } else if (current && line.trim()) {
      tags[current] = `${tags[current]} ${line.trim()}`.trim();
    } else {
      // A blank line ends a tag; prose after the tags is notes for whoever records the flow, not for viewers.
      current = undefined;
      if (!tagged) {
        prose.push(line);
      }
    }
  }
  const description = prose
    .join('\n')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ');
  // The file is named for the demo (`sales-charts.mjs`), which makes a better title than its first sentence.
  const name = path
    .basename(file)
    .replace(/\.m?js$/, '')
    .replace(/[-_]+/g, ' ');
  // `/tmp/demo/flow.mjs`, the working copy, names nothing; its first sentence has to do.
  const fallback = name === 'flow' && description ? description.split(/[.:;]\s/)[0].replace(/\.$/, '') : name;
  return {
    title: tags.title ?? fallback.charAt(0).toUpperCase() + fallback.slice(1),
    description: description || undefined,
    mdl: tags.mdl,
    app: tags.app,
    template: tags.template,
    prompt: tags.prompt,
  };
};

/**
 * What the running app says about its own configuration, read through the client's devtools hook before the
 * browser closes. Every field is optional: a storybook story or a booting page has no client.
 */
export const pageInfo = async (page) => {
  if (!page) {
    return {};
  }
  try {
    return await Promise.race([
      page.evaluate(() => {
        const values = globalThis.__DXOS__?.client?.config?.values;
        return {
          url: location.href,
          environment: values?.runtime?.app?.env?.DX_ENVIRONMENT,
          edge: values?.runtime?.services?.edge?.url,
          version: values?.runtime?.app?.build?.version,
        };
      }),
      new Promise((resolve) => setTimeout(() => resolve({}), 3_000)),
    ]);
  } catch {
    return {};
  }
};

/** The `recording` block of `timeline.json`. */
export const recordingInfo = async ({ page, flowFile, appUrl, target }) => {
  const app = await pageInfo(page);
  // A flow still being written lives in /tmp, outside any checkout; the driver runs from the one it records.
  const fromFlow = flowFile ? gitInfo(path.dirname(flowFile)) : {};
  const repo = fromFlow.root ? fromFlow : gitInfo(process.cwd());
  const doc = flowDoc(flowFile);
  // `about:` and `file:` pages have the origin `null`; the URL the driver was given is the better record then.
  const origin = app.url ? new URL(app.url).origin : undefined;
  const composerUrl = origin && origin !== 'null' ? origin : appUrl;
  const edgeUrl = app.edge ?? process.env.DX_EDGE_BASE_URL;
  return {
    recordedAt: new Date().toISOString(),
    target,
    git: { branch: repo.branch, commit: repo.commit, dirty: repo.dirty, remote: repo.remote },
    // Repo-relative only when the flow is inside the checkout; `/tmp/demo/flow.mjs` stays absolute, and `pack.mjs`
    // refuses it, since no one else can check it out.
    flow:
      flowFile && repo.root && !path.relative(repo.root, flowFile).startsWith('..')
        ? path.relative(repo.root, flowFile)
        : flowFile,
    composer: {
      url: composerUrl,
      environment: app.environment ?? environmentOf(composerUrl),
      version: app.version,
    },
    edge: edgeUrl ? { url: edgeUrl, environment: environmentOf(edgeUrl) } : undefined,
    ...doc,
  };
};
