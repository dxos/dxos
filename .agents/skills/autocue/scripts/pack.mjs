#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

/**
 * Packs one or more trimmed demos into an autocue bundle: a folder with a self-contained player page, the videos,
 * and a manifest (FORMAT.md). The same folder is uploaded to R2, published as a Claude Artifact, or zipped.
 *
 *   node pack.mjs --demo /tmp/demo/demo.autocue.json [--demo /tmp/other] --out /tmp/bundle --title "Sheets"
 *     [--zip] [--upload [<slug>]] [--formats mp4,webm] [--script off] [--poster off] [--prompt <text>]
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

/** The prompt a viewer copies to their agent to record this demo again, from what the take knows about itself. */
const defaultPrompt = (demo, recording, scriptFile) => {
  const git = recording.git ?? {};
  const lines = [`Cue the "${demo.title}" autocue demo and run it end to end.`, ''];
  if (recording.flow && !recording.flow.startsWith('/')) {
    lines.push(`- Flow: \`${recording.flow}\`${recording.mdl ? ` (spec: ${recording.mdl})` : ''}`);
  } else {
    lines.push(
      `- Flow: not committed; copy it from this bundle's "Autocue script" panel (${scriptFile}) to /tmp/demo/flow.mjs.`,
    );
    if (recording.mdl) {
      lines.push(`- Spec: ${recording.mdl}`);
    }
  }
  if (git.branch) {
    lines.push(
      `- Branch: \`${git.branch}\`${git.commit ? ` (recorded at ${git.commit.slice(0, 9)})` : ''}${git.remote ? ` in ${git.remote}` : ''}`,
    );
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
    'Follow the autocue skill (.agents/skills/autocue/SKILL.md): check out the branch, serve the app against the same EDGE, start the driver, run the flow, then trim it and pack it with pack.mjs so the new take can be compared with this one.',
  );
  return lines.join('\n');
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

const ids = new Set();
const files = [];
const warnings = [];
const demos = options.demo.map((input, position) => {
  const sidecarFile = resolveSidecar(input);
  const sidecar = JSON.parse(readFileSync(sidecarFile, 'utf8'));
  const recording = sidecar.recording ?? {};
  const flowFile = sidecar.flow && existsSync(sidecar.flow) ? sidecar.flow : undefined;
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
  if (flowFile && options.script !== 'off') {
    const name = `${id}/flow.mjs`;
    copyFileSync(flowFile, path.join(out, name));
    files.push(name);
    script = { path: recording.flow ?? path.basename(flowFile), file: name, source: readFileSync(flowFile, 'utf8') };
  }

  return {
    id,
    title,
    description: recording.description,
    duration: sidecar.duration,
    narrated: !!sidecar.narrated,
    videos,
    poster: posterName,
    uploaded: sidecar.uploaded,
    chapters: (sidecar.chapters ?? []).map(({ at, end, title: chapter, subtitle }) => ({
      at,
      end,
      title: chapter,
      ...(subtitle ? { subtitle } : {}),
    })),
    recording,
    script,
    prompt:
      (options.demo.length === 1 && typeof options.prompt === 'string' ? options.prompt : undefined) ??
      recording.prompt ??
      defaultPrompt({ title }, recording, script?.file ?? 'flow.mjs'),
  };
});

const manifest = {
  format: 'autocue@1',
  title: typeof options.title === 'string' ? options.title : demos.length === 1 ? demos[0].title : 'Autocue demos',
  created: new Date().toISOString(),
  demos,
};

/** `</script>` inside the JSON would end the manifest's script element early. */
const embed = (value) => JSON.stringify(value).replaceAll('</', '<\\/').replaceAll('<!--', '<\\!--');
const escapeHtml = (value) =>
  String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

const template = readFileSync(path.join(HERE, 'player.html'), 'utf8');
const fragment = template
  .replace('{{TITLE}}', escapeHtml(manifest.title))
  .replace('{{MANIFEST}}', () => embed(manifest));
writeFileSync(path.join(out, 'autocue.json'), JSON.stringify(manifest, null, 2));
// The Artifact tool wraps a published page in its own document; R2 and a local file need a whole one.
writeFileSync(path.join(out, 'artifact.html'), fragment);
writeFileSync(
  path.join(out, 'index.html'),
  `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n${fragment}\n</body>\n</html>\n`,
);
files.unshift('index.html', 'autocue.json');

/** `zip` when installed, else a tarball: both unpack into one folder whose index.html plays from disk. */
const archive = () => {
  const base = path.basename(out);
  const parent = path.dirname(out);
  const zip = `${out}.zip`;
  rmSync(zip, { force: true });
  const zipped = spawnSync('zip', ['-qr', zip, base, '-x', `${base}/artifact.html`], { cwd: parent });
  if (zipped.status === 0) {
    return zip;
  }
  const tarball = `${out}.tar.gz`;
  const tarred = spawnSync('tar', ['-czf', tarball, '--exclude', `${base}/artifact.html`, base], { cwd: parent });
  return tarred.status === 0 ? tarball : undefined;
};

/** Every file under one R2 prefix, so the page's relative links resolve; returns the player's public URL. */
const upload = async () => {
  const prefix = `autocue/${new Date().toLocaleDateString('en-CA')}-${typeof options.upload === 'string' ? slug(options.upload) : slug(manifest.title)}`;
  const script = path.resolve(HERE, '../../hosting-artifacts/scripts/upload-artifact.mjs');
  let indexUrl;
  for (const file of files) {
    const proc = spawn(process.execPath, [script, path.join(out, file), '--key', `${prefix}/${file}`], {
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    let text = '';
    proc.stdout.on('data', (chunk) => (text += chunk));
    const [code] = await once(proc, 'close');
    if (code !== 0) {
      throw new Error(`upload failed: ${file}`);
    }
    if (file === 'index.html') {
      indexUrl = text.trim().split('\n').pop();
    }
  }
  return indexUrl;
};

const zip = options.zip ? archive() : undefined;
const uploaded = options.upload ? await upload() : undefined;

console.log(
  JSON.stringify(
    {
      out,
      index: path.join(out, 'index.html'),
      demos: demos.map(({ id, title, chapters, duration }) => ({ id, title, chapters: chapters.length, duration })),
      zip,
      uploaded,
      // For the Artifact tool: publish `artifact.html` with these as `files` (published path -> source path).
      artifact: {
        file_path: path.join(out, 'artifact.html'),
        files: Object.fromEntries(
          files.filter((file) => file !== 'index.html').map((file) => [file, path.join(out, file)]),
        ),
      },
      warnings,
    },
    null,
    2,
  ),
);
