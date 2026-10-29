#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

/**
 * Builds a PR's showcase: a presentation in plugin-presenter's Slidev subset, made of a summary slide and one slide
 * per demo artifact, with each autocue script's narration as that slide's speaker notes.
 *
 *   node .agents/skills/showcase/scripts/showcase.mjs --title 'Showcase decks' \
 *     --summary /tmp/pr/summary.md --pr https://github.com/dxos/dxos/pull/1234 \
 *     --feature packages/plugins/plugin-presenter/PLUGIN.mdl#F-13 \
 *     --script packages/plugins/plugin-chess/autocue/play-the-opening.script.md \
 *     --image https://…/after.png --caption 'The deck after import' \
 *     --out /tmp/pr/showcase
 *
 * Writes `<out>.md` (the whole deck: `CreateShowcase`'s `content`, or a Markdown document Composer previews as
 * slides) and `<out>.json` (`{ name, slides }`, the `CreatePresentation` input). Artifacts become slides in the order
 * given; a `--caption` names the artifact before it.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseScript } from '../../autocue/scripts/script.mjs';

// Single-quoted, as the repo's formatter rewrites a deck's headmatter; a committed deck then stays byte-stable.
const yaml = (value) => `'${String(value).replace(/\s+/g, ' ').replaceAll("'", "''")}'`;

/** Frontmatter on every slide, so no body line can be mistaken for the next slide's YAML. */
const slide = (frontmatter, body, notes = [], { first = false } = {}) => {
  const fields = Object.entries(frontmatter)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${typeof value === 'string' ? yaml(value) : value}`);
  // A note containing `-->` would close the comment early and leak the rest onto the slide.
  const notesBlock =
    notes.length > 0 ? `\n\n<!--\n${notes.map((line) => `- ${line.replaceAll('-->', '->')}`).join('\n')}\n-->` : '';
  // A later slide's opening `---` is a thematic break to a markdown formatter, which puts a blank line after it.
  return `---\n${first ? '' : '\n'}${fields.join('\n')}\n---\n\n${body.trim()}${notesBlock}`.trimEnd();
};

/**
 * Makes PR-body markdown safe inside one slide: keeps the Summary section without its heading and metadata lines,
 * HTML comments (which would read as notes), and turns `---` rules into `***` so they cannot split the slide.
 */
export const sanitizeSummary = (markdown) => {
  // A whole PR body (`pr-description` templates) contributes only its Summary section.
  const section = markdown.match(/^##\s+Summary\s*$([\s\S]*?)(?=^##\s|(?![\s\S]))/m)?.[1] ?? markdown;
  let fenced = false;
  return section
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n')
    .filter((line) => !/^\*\*(Sections|Linear|Showcase):\*\*/.test(line))
    .map((line) => {
      if (/^ {0,3}(`{3,}|~{3,})/.test(line)) {
        fenced = !fenced;
      }
      // The deck splits only outside fenced code, so a `---` inside a code block stays as written.
      return !fenced && /^\s*-{3,}\s*$/.test(line) ? '***' : line;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .replace(/(?:\n+\*\*\*)+$/, '');
};

const featureLabel = (reference) => {
  const [spec, id] = reference.split('#');
  return id ? `${id} (${path.basename(spec)})` : path.basename(spec);
};

/**
 * The deck's slides, in order: summary first, then each artifact.
 */
export const buildSlides = ({ title, summary, pr, features = [], artifacts = [] }) => {
  const meta = [
    pr ? `**Pull request:** [${pr.replace(/^https:\/\/github\.com\//, '')}](${pr})` : undefined,
    features.length > 0 ? `**Features:** ${features.map(featureLabel).join(', ')}` : undefined,
  ].filter(Boolean);
  const slides = [
    slide(
      { title },
      [`# ${title}`, summary ? sanitizeSummary(summary) : undefined, meta.join('  \n') || undefined]
        .filter(Boolean)
        .join('\n\n'),
      [],
      { first: true },
    ),
  ];

  for (const artifact of artifacts) {
    if (artifact.kind === 'image') {
      const caption = artifact.caption ?? 'Screenshot';
      slides.push(slide({ title: caption, layout: 'center' }, `![${caption}](${artifact.url})\n\n${caption}`));
    } else if (artifact.kind === 'video') {
      const caption = artifact.caption ?? 'Demo';
      // A background video renders muted and looping; the link keeps the narrated original one click away.
      slides.push(
        slide({ title: caption, backgroundVideo: artifact.url }, `[${caption}](${artifact.url})`, artifact.notes),
      );
    } else if (artifact.kind === 'script') {
      const { script } = artifact;
      const caption = artifact.caption ?? script.title ?? 'Demo';
      const onCamera = script.steps.filter((step) => !step.setup);
      const notes = onCamera.map((step) => step.narration ?? step.name);
      if (script.video) {
        slides.push(slide({ title: caption, backgroundVideo: script.video }, `[${caption}](${script.video})`, notes));
      } else {
        // No recording yet: the steps themselves are the slide, so the deck still says what the demo shows.
        const steps = onCamera.map((step, index) => `${index + 1}. ${step.name}`).join('\n');
        slides.push(slide({ title: caption }, `## ${caption}\n\n${steps}`, notes));
      }
    }
  }
  return slides;
};

/**
 * Joins slides into one Slidev document; every slide opens with its own frontmatter, which is its separator.
 */
export const renderDeck = (slides) => `${slides.join('\n\n')}\n`;

/**
 * The `showcase` block a spec carries for this deck (`lang/showcase.mdl`), for `--id`.
 */
export const renderShowcaseBlock = ({ id, title, pr, features = [], artifacts = [] }) => {
  const ids = features.map((reference) => reference.split('#')[1]).filter(Boolean);
  const video = artifacts.map((artifact) => artifact.url ?? artifact.script?.video).find(Boolean);
  return [
    '```mdl',
    `showcase ${id}: ${title}`,
    `  for: [${ids.join(', ')}]`,
    ...(pr ? [`  pr: ${pr}`] : []),
    ...(video ? [`  video: ${video}`] : []),
    '```',
  ].join('\n');
};

/** Reads the flags in order, so each `--caption` attaches to the artifact before it. */
export const parseArgv = (argv, { readFile = (file) => readFileSync(file, 'utf8') } = {}) => {
  const options = { features: [], artifacts: [] };
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`${flag} needs a value`);
    }
    index++;
    switch (flag) {
      case '--title':
        options.title = value;
        break;
      case '--summary':
        options.summary = readFile(value === '-' ? 0 : value);
        break;
      case '--pr':
        options.pr = value;
        break;
      case '--feature':
        options.features.push(value);
        break;
      case '--id':
        options.id = value;
        break;
      case '--out':
        options.out = value;
        break;
      case '--video':
      case '--image':
        options.artifacts.push({ kind: flag.slice(2), url: value });
        break;
      case '--script':
        options.artifacts.push({ kind: 'script', script: parseScript(readFile(value)) });
        break;
      case '--caption': {
        const last = options.artifacts[options.artifacts.length - 1];
        if (!last) {
          throw new Error('--caption follows the --video, --image or --script it names');
        }
        last.caption = value;
        break;
      }
      default:
        throw new Error(`unknown flag ${flag}`);
    }
  }
  if (!options.title) {
    throw new Error('--title is required');
  }
  return options;
};

const main = () => {
  const options = parseArgv(process.argv.slice(2));
  const slides = buildSlides(options);
  const deck = renderDeck(slides);
  if (!options.out) {
    process.stdout.write(deck);
  } else {
    mkdirSync(path.dirname(path.resolve(options.out)), { recursive: true });
    writeFileSync(`${options.out}.md`, deck);
    writeFileSync(`${options.out}.json`, `${JSON.stringify({ name: options.title, slides }, null, 2)}\n`);
    console.log(`deck ${options.out}.md (${slides.length} slides)\npresentation ${options.out}.json`);
  }
  if (options.id) {
    console.error(`\n${renderShowcaseBlock(options)}`);
  }
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
