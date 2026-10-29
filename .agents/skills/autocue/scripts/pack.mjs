#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

/**
 * Packs one or more trimmed demos into an autocue bundle: a folder with a self-contained player page, the videos,
 * and a manifest (FORMAT.md). The same folder is uploaded to R2, published as a Claude Artifact, or zipped.
 *
 *   node pack.mjs --demo /tmp/demo/demo.autocue.json [--demo /tmp/other] --out /tmp/bundle --title "Sheets"
 *     [--zip] [--upload [<slug>]] [--host dx.pub|r2] [--formats mp4,webm] [--script off] [--poster off] [--prompt <text>]
 *     [--rebuild]
 *
 * `--demo` takes a sidecar the trimmer wrote (`<name>.autocue.json`) or a directory holding one; repeat it for a
 * multi-demo bundle, in the order the reel should show them.
 */

import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FFMPEG = process.env.FFMPEG_PATH ?? 'ffmpeg';
/** A Claude Artifact refuses a binary file over 15 MB. */
const ARTIFACT_FILE_LIMIT = 15 * 1024 * 1024;

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = { demo: [] };
  for (let index = 0; index < args.length; index++) {
    const key = args[index].replace(/^--/, '');
    const value = args[index + 1];
    const flag = value === undefined || value.startsWith('--');
    if (key === 'demo') {
      options.demo.push(value);
      index++;
      continue;
    }
    options[key] = flag ? true : value;
    if (!flag) {
      index++;
    }
  }
  return options;
};

const options = parseArgs();
if (!options.demo.length || !options.out) {
  console.error(
    'usage: node pack.mjs --demo <sidecar.autocue.json|dir> [--demo …] --out <dir> [--title <text>] [--zip] [--upload [<slug>]] [--formats mp4,webm] [--script off] [--poster off] [--prompt <text>]',
  );
  process.exit(1);
}

const slug = (text) =>
  String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);

/** A directory holds the trimmer's sidecar; the newest one wins, as a re-trim leaves the old one beside it. */
const resolveSidecar = (input) => {
  const file = path.resolve(input);
  if (!existsSync(file)) {
    throw new Error(`no such demo: ${input}`);
  }
  if (statSync(file).isFile()) {
    return file;
  }
  const found = readdirSync(file)
    .filter((name) => name.endsWith('.autocue.json'))
    .map((name) => path.join(file, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
  if (!found) {
    throw new Error(`${input} holds no *.autocue.json — run trim-static.mjs on the recording first`);
  }
  return found;
};

const MIME = { '.mp4': 'video/mp4', '.webm': 'video/webm' };

/**
 * The prompt a viewer copies to their agent to record this demo again. It opens with the checkout, since the flow,
 * the spec and the app all have to be the versions the take ran.
 */
const defaultPrompt = (demo, recording) => {
  const git = recording.git;
  const lines = [
    `Check out \`${git.branch}\` at commit \`${git.commit}\` of ${git.remote ?? 'the repository'} (\`git fetch origin ${git.branch} && git checkout ${git.commit}\`).`,
    '',
    `Then cue the "${demo.title}" autocue demo and run it end to end:`,
    '',
    `- Flow: \`${recording.flow}\``,
  ];
  if (recording.mdl) {
    lines.push(`- Spec: ${recording.mdl}`);
  }
  if (recording.composer?.url || recording.composer?.environment) {
    lines.push(`- Composer: ${[recording.composer.environment, recording.composer.url].filter(Boolean).join(' — ')}`);
  }
  if (recording.edge) {
    lines.push(`- EDGE: ${[recording.edge.environment, recording.edge.url].filter(Boolean).join(' — ')}`);
  }
  if (recording.template) {
    lines.push(`- Space template: ${recording.template}`);
  }
  if (recording.app) {
    lines.push(`- Serve: ${recording.app}`);
  }
  lines.push(
    '',
    'Follow the autocue skill (.agents/skills/autocue/SKILL.md): serve the app against the same EDGE, start the driver, run the flow, then trim it and pack it with pack.mjs so the new take can be compared with this one.',
  );
  return lines.join('\n');
};

const git = (...args) => {
  const result = spawnSync('git', ['-C', HERE, ...args], { encoding: 'utf8' });
  return result.status === 0 ? result.stdout : undefined;
};

/**
 * A bundle is for other people, so its flow has to be one they can check out: committed under a package's
 * `autocue/` folder and unchanged since the commit the take recorded. Returns the flow's source at that commit.
 */
const committedFlow = (recording, sidecarFile) => {
  const flow = recording.flow;
  const commit = recording.git?.commit;
  const fail = (reason) => {
    throw new Error(
      `${sidecarFile}: ${reason}\n  Commit the flow as packages/<package>/autocue/<name>.mjs (SKILL.md "Commit the flow"), record the take again from that commit, then pack it.`,
    );
  };
  if (!flow) {
    fail('the take ran no flow script');
  }
  if (path.isAbsolute(flow) || flow.startsWith('..')) {
    fail(`the flow ${flow} is outside the repository`);
  }
  if (!commit || !recording.git?.branch) {
    fail('the recording names no branch and commit');
  }
  const source = git('show', `${commit}:${flow}`);
  if (source === undefined) {
    fail(`${flow} is not committed at ${commit.slice(0, 9)}`);
  }
  // The take ran the file on disk; a flow edited after its commit is not what the commit reproduces.
  if (git('diff', '--quiet', commit, '--', flow) === undefined) {
    fail(`${flow} has changes since ${commit.slice(0, 9)} that the take may have run`);
  }
  if (!git('branch', '-r', '--contains', commit)?.trim()) {
    warnings.push(`${commit.slice(0, 9)} is on no remote branch yet: push ${recording.git.branch} before sharing`);
  }
  return source;
};

/** A still from a beat into the first chapter, so the player shows the product rather than a black frame. */
const poster = (video, at, file) => {
  const result = spawnSync(
    FFMPEG,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-ss',
      String(at),
      '-i',
      video,
      '-frames:v',
      '1',
      '-vf',
      'scale=1280:-2',
      '-q:v',
      '4',
      '-y',
      file,
    ],
    { stdio: 'ignore' },
  );
  return result.status === 0 && existsSync(file);
};

const out = path.resolve(options.out);
// A re-pack replaces the previous bundle whole, so a demo dropped from the reel does not linger in its folder; any
// other non-empty directory is someone else's and is left alone.
if (existsSync(out) && readdirSync(out).length) {
  if (!existsSync(path.join(out, 'autocue.json'))) {
    console.error(`${out} is not empty and holds no autocue bundle; pick another --out`);
    process.exit(1);
  }
  rmSync(out, { recursive: true });
}
mkdirSync(out, { recursive: true });

/** H.264 alone plays in every browser; `--formats mp4,webm` adds the WebM, at twice the bundle size. */
const formats = String(options.formats ?? 'mp4')
  .split(',')
  .map((format) => `.${format.trim().replace(/^\./, '')}`);

/** Lower case, words only: how a chapter title and a spec step's `name` or `do:` are compared. */
const normalize = (text) =>
  String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * The `.mdl` test a take was written from (`@mdl <file> test <id>`), read from git at the recorded commit, as its
 * source lines with each step's span. A step is tied to the chapter whose title is its `name` or its `do:` (flows name
 * their steps after the spec's), so the player can highlight it and seek to it.
 */
const specOf = (recording, chapters) => {
  const match = recording.mdl?.match(/^(\S+\.mdl)\s+(?:test|flow)\s+(\S+)/);
  if (!match) {
    return undefined;
  }
  const [, file, test] = match;
  const source = git('show', `${recording.git.commit}:${file}`);
  if (source === undefined) {
    warnings.push(`${file} is not in ${recording.git.commit.slice(0, 9)}; the bundle has no spec view`);
    return undefined;
  }
  const all = source.split('\n');
  const start = all.findIndex((line) =>
    new RegExp(`^\\s*(test|flow)\\s+${test.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(line),
  );
  if (start < 0) {
    warnings.push(`${file} has no test ${test}; the bundle has no spec view`);
    return undefined;
  }
  const indent = all[start].match(/^\s*/)[0].length;
  let end = start + 1;
  // The block runs until a line at the header's indent or less, or the code fence that closes it.
  while (
    end < all.length &&
    (!all[end].trim() || all[end].match(/^\s*/)[0].length > indent) &&
    !/^\s*```/.test(all[end])
  ) {
    end++;
  }
  const lines = all.slice(start, end).map((line) => line.slice(indent));
  while (lines.length && !lines.at(-1).trim()) {
    lines.pop();
  }

  const steps = [];
  lines.forEach((line, index) => {
    const name = line.match(/^(\s*)- name:\s*(.*)$/);
    if (!name) {
      return;
    }
    const stepIndent = name[1].length;
    let last = index;
    for (let next = index + 1; next < lines.length; next++) {
      const nextIndent = lines[next].match(/^\s*/)[0].length;
      if (lines[next].trim() && nextIndent <= stepIndent) {
        break;
      }
      if (lines[next].trim()) {
        last = next;
      }
    }
    const doText = lines
      .slice(index, last + 1)
      .find((text) => /^\s*do:/.test(text))
      ?.replace(/^\s*do:\s*/, '');
    steps.push({ name: name[2].trim(), start: index, end: last, do: doText });
  });

  const used = new Set();
  const chapterOf = (step) => {
    const keys = [normalize(step.name), normalize(step.do)].filter(Boolean);
    const exact = chapters.findIndex((chapter, index) => !used.has(index) && keys.includes(normalize(chapter.title)));
    const index =
      exact >= 0
        ? exact
        : chapters.findIndex(
            (chapter, index) =>
              !used.has(index) &&
              keys.some((key) => normalize(chapter.title).includes(key) || key.includes(normalize(chapter.title))),
          );
    if (index >= 0) {
      used.add(index);
      return index;
    }
    return undefined;
  };

  return {
    path: file,
    test,
    line: start + 1,
    lines,
    steps: steps.map(({ name, start: from, end: to, ...step }) => {
      const chapter = chapterOf({ name, ...step });
      return { name, start: from, end: to, ...(chapter !== undefined ? { chapter } : {}) };
    }),
  };
};

const ids = new Set();
const files = [];
const warnings = [];
const packDemo = (input, position) => {
  const sidecarFile = resolveSidecar(input);
  const sidecar = JSON.parse(readFileSync(sidecarFile, 'utf8'));
  const recording = sidecar.recording ?? {};
  const flowSource = committedFlow(recording, sidecarFile);
  const title = recording.title ?? sidecar.name ?? path.basename(sidecarFile, '.autocue.json');

  let id =
    slug(sidecar.name && recording.title ? `${sidecar.name}-${recording.title}` : title) || `demo-${position + 1}`;
  while (ids.has(id)) {
    id = `${id}-${position + 1}`;
  }
  ids.add(id);
  mkdirSync(path.join(out, id), { recursive: true });

  // MP4 first: Safari and iOS play it, and every browser takes the first <source> it can play.
  const available = (sidecar.videos ?? []).filter((video) => existsSync(video));
  const chosen = available.filter((video) => formats.includes(path.extname(video)));
  // A take with no MP4 (the trimmer ran without `--mp4`) still ships, as whatever it has.
  const videos = (chosen.length ? chosen : available.slice(0, 1))
    .toSorted((a, b) => (a.endsWith('.mp4') ? -1 : 0) - (b.endsWith('.mp4') ? -1 : 0))
    .map((video) => {
      const ext = path.extname(video);
      const name = `${id}/video${ext}`;
      copyFileSync(video, path.join(out, name));
      files.push(name);
      const size = statSync(video).size;
      if (size > ARTIFACT_FILE_LIMIT) {
        warnings.push(`${name} is ${(size / 1024 / 1024).toFixed(1)} MB — over the 15 MB Artifact file limit`);
      }
      return { src: name, type: MIME[ext] };
    });
  if (!videos.length) {
    throw new Error(`${sidecarFile} names no video that exists`);
  }

  let posterName;
  if (options.poster !== 'off') {
    const at = (sidecar.chapters?.[0]?.at ?? 0) + 1;
    const name = `${id}/poster.jpg`;
    if (poster(path.join(out, videos.at(-1).src), at, path.join(out, name))) {
      posterName = name;
      files.push(name);
    }
  }

  let script;
  if (options.script !== 'off') {
    const name = `${id}/flow.mjs`;
    writeFileSync(path.join(out, name), flowSource);
    files.push(name);
    script = { path: recording.flow, file: name, source: flowSource };
  }

  const chapters = (sidecar.chapters ?? []).map(({ at, end, title: chapter, subtitle }) => ({
    at,
    end,
    title: chapter,
    ...(subtitle ? { subtitle } : {}),
  }));

  return {
    id,
    title,
    description: recording.description,
    duration: sidecar.duration,
    narrated: !!sidecar.narrated,
    videos,
    poster: posterName,
    uploaded: sidecar.uploaded,
    chapters,
    recording,
    script,
    spec: specOf(recording, chapters),
    prompt:
      (options.demo.length === 1 && typeof options.prompt === 'string' ? options.prompt : undefined) ??
      recording.prompt ??
      defaultPrompt({ title }, recording),
  };
};

let demos;
try {
  demos = options.demo.map(packDemo);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const bundleTitle =
  typeof options.title === 'string' ? options.title : demos.length === 1 ? demos[0].title : 'Autocue demos';
const bundleSlug = slug(typeof options.upload === 'string' ? options.upload : bundleTitle);

/**
 * Where an uploaded bundle is served. `dx.pub/demo/<slug>/` is the address to share; the bucket's r2.dev URL is the
 * same objects, for while the dx.pub route is not deployed.
 */
const HOSTS = {
  'dx.pub': 'https://dx.pub/demo',
  'r2': 'https://pub-39066a86073446d7b77b1c157b660bb5.r2.dev/autocue',
};
const host = HOSTS[options.host ?? process.env.AUTOCUE_HOST ?? 'dx.pub'];
if (!host) {
  console.error(`--host takes ${Object.keys(HOSTS).join(' or ')}`);
  process.exit(1);
}
const prefix = `${new Date().toLocaleDateString('en-CA')}-${bundleSlug}`;
const hosted = options.upload ? `${host}/${prefix}/` : undefined;
const archiveName = options.zip || options.upload ? `${bundleSlug}.zip` : undefined;

const manifest = {
  format: 'autocue@1',
  title: bundleTitle,
  created: new Date().toISOString(),
  ...(archiveName ? { archive: archiveName } : {}),
  demos,
};

/** Every `<` as a JSON escape, so neither `</script>` nor `<!--` in a flow or spec can end the element early. */
const embed = (value) => JSON.stringify(value).replaceAll('<', '\\u003c');
const escapeHtml = (value) =>
  String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

/**
 * The player page, built from `tools/autocue/player` (react-ui) into one file. A Vite build of it takes seconds, so it
 * is rebuilt whenever its sources are newer than the build, and `--rebuild` forces it.
 */
const REPO = path.resolve(HERE, '../../../..');
const PLAYER = path.join(REPO, 'tools/autocue');
const PLAYER_HTML = path.join(PLAYER, 'dist/player/index.html');
const newest = (dir) =>
  readdirSync(dir, { withFileTypes: true }).reduce((latest, entry) => {
    const file = path.join(dir, entry.name);
    return Math.max(latest, entry.isDirectory() ? newest(file) : statSync(file).mtimeMs);
  }, 0);
const buildPlayer = () => {
  const stale =
    options.rebuild ||
    !existsSync(PLAYER_HTML) ||
    Math.max(newest(path.join(PLAYER, 'player')), newest(path.join(PLAYER, 'src/player'))) >
      statSync(PLAYER_HTML).mtimeMs;
  if (!stale) {
    return;
  }
  const build = spawnSync(
    'pnpm',
    ['exec', 'vite', 'build', '--config', 'player/vite.config.ts', '--logLevel', 'error'],
    {
      cwd: PLAYER,
      stdio: ['ignore', 'ignore', 'inherit'],
    },
  );
  if (build.status !== 0 || !existsSync(PLAYER_HTML)) {
    console.error(
      'the player build failed: run `pnpm exec vite build --config player/vite.config.ts` in tools/autocue',
    );
    process.exit(1);
  }
};
buildPlayer();

const template = readFileSync(PLAYER_HTML, 'utf8');
const page = (value) =>
  template.replace('{{TITLE}}', () => escapeHtml(value.title)).replace('{{MANIFEST}}', () => embed(value));

writeFileSync(path.join(out, 'autocue.json'), JSON.stringify(manifest, null, 2));
writeFileSync(path.join(out, 'index.html'), page(manifest));
files.unshift('index.html', 'autocue.json');

/** `zip` when installed: one folder whose index.html plays from disk, without the Artifact copy. */
const archive = () => {
  const base = path.basename(out);
  const zip = path.join(path.dirname(out), `${base}.zip`);
  rmSync(zip, { force: true });
  const zipped = spawnSync('zip', ['-qr', zip, base, '-x', `${base}/artifact.html`], { cwd: path.dirname(out) });
  if (zipped.status !== 0) {
    console.error('zip failed (is `zip` installed?)');
    process.exit(1);
  }
  // Inside the bundle too, so the player's Bundle link finds it beside index.html.
  copyFileSync(zip, path.join(out, archiveName));
  files.push(archiveName);
  return zip;
};

const uploadFile = async (file, key) => {
  const script = path.resolve(HERE, '../../hosting-artifacts/scripts/upload-artifact.mjs');
  const proc = spawn(process.execPath, [script, file, '--key', key], { stdio: ['ignore', 'pipe', 'inherit'] });
  const [code] = await once(proc, 'close');
  if (code !== 0) {
    throw new Error(`upload failed: ${key}`);
  }
};

/**
 * Every file under one prefix of the `agent-artifacts` bucket (`autocue/<prefix>/`), so relative links resolve. Returns
 * the first address that serves the page: dx.pub when its route is live, else the bucket's own r2.dev URL.
 */
const upload = async () => {
  for (const file of files) {
    await uploadFile(path.join(out, file), `autocue/${prefix}/${file}`);
  }
  // dx.pub serves `<prefix>/` itself; r2.dev has no index document, so its page is the file.
  const candidates = [
    { base: hosted, page: hosted },
    { base: `${HOSTS.r2}/${prefix}/`, page: `${HOSTS.r2}/${prefix}/index.html` },
  ];
  for (const candidate of candidates) {
    const response = await fetch(candidate.page, { method: 'HEAD' }).catch(() => undefined);
    if (response?.ok) {
      if (candidate.base !== hosted) {
        warnings.push(`${hosted} does not answer yet; share ${candidate.page} until the dx.pub route is deployed`);
      }
      return candidate;
    }
  }
  warnings.push(`neither ${hosted} nor the r2.dev URL answered for the uploaded page`);
  return candidates[0];
};

/**
 * The Artifact tool wraps a page in its own document, and an Artifact cannot start a download, so its copy links the
 * downloads to the hosted bundle (when one answers) and drops the document shell.
 */
const writeArtifact = (base) =>
  writeFileSync(
    path.join(out, 'artifact.html'),
    fragment(page({ ...manifest, ...(base ? { hosted: base } : { archive: undefined }) })),
  );

/**
 * The head's and body's contents without the shell around them. Cut by position: the page's script is the last thing in
 * the body, so the first `</head>` and the last `</body>` are the shell's own.
 */
const fragment = (html) => {
  const head = html.slice(html.indexOf('<head>') + '<head>'.length, html.indexOf('</head>'));
  const body = html.slice(html.indexOf('<body>') + '<body>'.length, html.lastIndexOf('</body>'));
  return `${head.replace(/<meta (charset|name="viewport")[^>]*>\s*/gi, '').trim()}\n${body.trim()}\n`;
};

const zip = archiveName ? archive() : undefined;
const served = options.upload ? await upload() : undefined;
const uploaded = served?.page;
writeArtifact(served?.base);

console.log(
  JSON.stringify(
    {
      out,
      index: path.join(out, 'index.html'),
      demos: demos.map(({ id, title, chapters, duration, spec }) => ({
        id,
        title,
        chapters: chapters.length,
        spec: spec
          ? `${spec.path} ${spec.test}: ${spec.steps.filter((step) => step.chapter !== undefined).length}/${spec.steps.length} steps on camera`
          : undefined,
        duration,
      })),
      zip,
      uploaded,
      // For the Artifact tool: publish `artifact.html` with these as `files` (published path -> source path).
      artifact: {
        file_path: path.join(out, 'artifact.html'),
        files: Object.fromEntries(
          files
            .filter((file) => file !== 'index.html' && !file.endsWith('.zip'))
            .map((file) => [file, path.join(out, file)]),
        ),
      },
      warnings,
    },
    null,
    2,
  ),
);
