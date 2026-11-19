#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Checks a docs page against the docs voice, and a rewritten page against the version it replaces.
//
//   node .agents/skills/docs-writing/scripts/check-voice.mjs [--base <ref>] [--voice-only] [--quiet] [files...]
//
// With no files it checks every changed page under docs/src/content/docs. `--voice-only` skips the comparison with
// the base version, for a change that corrects facts, samples or tables on purpose.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const DOCS_ROOT = 'docs/src/content/docs';
/** Stands for a line of code in the prose, so samples keep their place. */
const CODE = '@@CODE@@';
const MAX_SENTENCE_WORDS = 30;
const MAX_PARAGRAPH_SENTENCES = 4;
/** How often one connective or one opener may recur on a page before it reads as a formula. */
const MAX_THIS_MEANS = 2;

/** British spellings; the docs use the American ones. */
const BRITISH =
  /\b(colou?red|colours?|centred?|centres|labelled|behaviours?|favou?rites?|organis(?:e|ed|es|ation)|grey)\b/gi;
const isBritish = (word) => /our|tre|lled|ise|isat|grey/i.test(word);

/** Words the house style replaces with a plainer one. */
const PADDING = [
  'additionally',
  'crucial',
  'delve',
  'effortlessly',
  'enhance',
  'enhances',
  'facilitate',
  'leverage',
  'leverages',
  'leveraging',
  'pivotal',
  'powerful',
  'robust',
  'seamless',
  'seamlessly',
  'showcase',
  'simply',
  'utilize',
  'utilizes',
  'utilizing',
  'versatile',
  'in order to',
  "it's important to note",
  'it is important to note',
  "it's worth noting",
  'it is worth noting',
  'in summary',
  'in conclusion',
  'serves as',
];

const args = process.argv.slice(2);
let base = 'HEAD';
let quiet = false;
let voiceOnly = false;
const files = [];
for (let index = 0; index < args.length; index++) {
  if (args[index] === '--base') {
    base = args[++index];
  } else if (args[index] === '--voice-only') {
    voiceOnly = true;
  } else if (args[index] === '--quiet') {
    quiet = true;
  } else {
    files.push(args[index]);
  }
}

const git = (...gitArgs) => execFileSync('git', gitArgs, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
const repoRoot = git('rev-parse', '--show-toplevel').trim();

const changedPages = () =>
  git('-C', repoRoot, 'diff', '--name-only', base, '--', DOCS_ROOT)
    .split('\n')
    .filter((file) => /\.mdx?$/.test(file))
    .map((file) => resolve(repoRoot, file));

const targets = files.length > 0 ? files.map((file) => resolve(file)) : changedPages();

const baseText = (file) => {
  try {
    return git('-C', repoRoot, 'show', `${base}:${relative(repoRoot, file)}`);
  } catch {
    return undefined;
  }
};

/** Splits a page into the parts a rewrite must keep and the prose it may change. */
const parse = (text) => {
  const frontmatterMatch = text.match(/^---\n[\s\S]*?\n---\n/);
  const frontmatter = frontmatterMatch?.[0] ?? '';
  const lines = text.slice(frontmatter.length).split('\n');

  const fences = [];
  const imports = [];
  const headings = [];
  const headingLines = new Set();
  const tableRows = [];
  const proseLines = [];
  const blockTags = [];
  let fence;
  let exportBlock = false;
  let tag;
  let firstHeadingLine;
  for (const line of lines) {
    const fenceMatch = line.match(/^\s*(```|~~~)/);
    // An MDX `export const` holds data for a component, not prose.
    if (exportBlock) {
      exportBlock = !/^[\])}`]+;?\s*$/.test(line);
      continue;
    }
    // A component tag that runs over several lines is kept whole.
    if (tag) {
      tag.push(line.trim());
      if (/\/?>\s*$/.test(line)) {
        blockTags.push(tag.join(' '));
        tag = undefined;
      }
      proseLines.push('');
      continue;
    }
    if (fence) {
      fence.push(line.trim());
      if (fenceMatch) {
        fences.push(fence.join('\n'));
        fence = undefined;
      }
      proseLines.push(CODE);
      continue;
    }
    if (fenceMatch) {
      fence = [line.trim()];
      proseLines.push(CODE);
    } else if (/^export (const|function) /.test(line)) {
      exportBlock = !/;\s*$/.test(line);
    } else if (/^\s*<[A-Z][\w.]*(\s[^>]*)?$/.test(line) && !/>\s*$/.test(line)) {
      tag = [line.trim()];
      proseLines.push('');
    } else if (/^import .* from /.test(line)) {
      imports.push(line.trim());
    } else if (/^#{1,6} /.test(line)) {
      firstHeadingLine ??= proseLines.length;
      headingLines.add(proseLines.length);
      headings.push(line.trim());
      proseLines.push('');
    } else if (/^\s*\|/.test(line)) {
      tableRows.push(line.trim().replace(/\s+/g, ' ').replace(/-{3,}/g, '---'));
      proseLines.push('');
    } else {
      proseLines.push(line);
    }
  }

  const prose = proseLines.join('\n');
  const tableText = tableRows.join('\n');
  const untitledAsides = [
    ...[...prose.matchAll(/<Aside\b[^>]*>/g), ...blockTags.filter((blockTag) => blockTag.startsWith('<Aside'))]
      .map((match) => (typeof match === 'string' ? match : match[0]))
      .filter((asideTag) => !/\btitle=/.test(asideTag)),
    ...[...prose.matchAll(/^:::(note|tip|caution|danger)\s*$/gm)].map((match) => match[0]),
  ];

  // The first words of the prose that follows each sample.
  const openers = [];
  proseLines.forEach((line, index) => {
    const endsSample = /<Snippet\b/.test(line) || (line === CODE && proseLines[index + 1] !== CODE);
    if (!endsSample) {
      return;
    }
    // The explanation is the prose straight after the sample: another sample or a heading ends the passage.
    let next;
    for (let following = index + 1; following < proseLines.length; following++) {
      const candidate = proseLines[following];
      if (headingLines.has(following) || candidate === CODE || /<Snippet\b/.test(candidate)) {
        return;
      }
      if (candidate.trim() && !/^\s*<\/?[A-Za-z][^>]*>\s*$/.test(candidate)) {
        next = candidate;
        break;
      }
    }
    if (next === undefined || /^\s*(\*\*Example\*\*|[-*] |\d+\. |:::)/.test(next)) {
      return;
    }
    // A name from the code is an opener of its own; a word before one is judged alone.
    const [first = '', second = ''] = next.trim().split(/\s+/);
    const words = first.startsWith('`') || second.startsWith('`') ? [first] : [first, second];
    openers.push(
      words
        .join(' ')
        .toLowerCase()
        .replace(/[.,:]+$/, ''),
    );
  });
  const components = [
    ...[...prose.matchAll(/<([A-Z][A-Za-z]*)\b[^>]*>/g)]
      .filter((match) => match[1] !== 'Aside')
      .map((match) => match[0].replace(/\s+/g, ' ')),
    ...blockTags.filter((blockTag) => !blockTag.startsWith('<Aside')),
  ];
  const links = new Set([...prose.matchAll(/\]\(([^)\s]+)\)/g)].map((match) => match[1]));
  // Facts sit in table cells as well as in sentences.
  const codeSpans = new Set([...`${prose}\n${tableText}`.matchAll(/`[^`\n]+`/g)].map((match) => match[0]));
  const tableKeys = tableRows.map((row) => row.split('|')[1]?.trim() ?? '');

  // Text a reader sees as sentences: no tags, link targets, code spans or list markers.
  const text_ = prose
    .replace(/<[^>]+>/g, ' ')
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/`[^`\n]+`/g, 'Code')
    .replace(/^:::.*$/gm, '');
  const numbers = new Set(`${text_}\n${tableText.replace(/`[^`\n]+`/g, 'Code')}`.match(/\b\d+(?:[.,]\d+)*\b/g) ?? []);

  return {
    frontmatter,
    imports,
    fences,
    headings,
    tableRows,
    tableKeys,
    tableText,
    untitledAsides,
    openers,
    components,
    links,
    codeSpans,
    numbers,
    prose,
    text: text_,
    firstHeadingLine: firstHeadingLine ?? Infinity,
  };
};

const count = (items) => {
  const counts = new Map();
  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  return counts;
};

/** Items whose count differs between two lists, as `-removed` and `+added` lines. */
const diffCounts = (before, after) => {
  const beforeCounts = count(before);
  const afterCounts = count(after);
  const out = [];
  for (const [item, total] of beforeCounts) {
    if ((afterCounts.get(item) ?? 0) < total) {
      out.push(`- ${item}`);
    }
  }
  for (const [item, total] of afterCounts) {
    if ((beforeCounts.get(item) ?? 0) < total) {
      out.push(`+ ${item}`);
    }
  }
  return out;
};

const normalizeImport = (line) =>
  line
    .replace(/\bAside,\s*/, '')
    .replace(/,\s*Aside\b/, '')
    .replace(/\s+/g, ' ');
const isAsideOnlyImport = (line) =>
  /^import \{\s*Aside\s*\} from ['"]@astrojs\/starlight\/components['"];?$/.test(line);

const sentences = (paragraph) =>
  paragraph
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?](?:\*\*)?)\s+(?=(?:\*\*)?[A-Z"'[(])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.split(' ').length > 2);

const paragraphs = (text) =>
  text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph && !paragraph.includes(CODE) && !/^\*\*Example\*\*/.test(paragraph));

const checkVoice = (page, isTutorial) => {
  const errors = [];
  const warnings = [];

  if (/[—–]/.test(page.text)) {
    errors.push('Dash used as punctuation. End the sentence or use a comma.');
  }
  const lower = page.text.toLowerCase();
  for (const phrase of PADDING) {
    if (new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(lower)) {
      errors.push(`Padding: "${phrase}".`);
    }
  }
  for (const heading of page.headings) {
    const words = heading
      .replace(/^#+ /, '')
      .replace(/`[^`]+`/g, '')
      .split(/\s+/)
      .filter(Boolean);
    const capitalized = words.slice(1).filter((word) => /^[A-Z][a-z]+$/.test(word));
    if (words.length >= 3 && capitalized.length >= words.length - 1) {
      warnings.push(`Heading may be in Title Case: ${heading}`);
    }
  }

  for (const heading of page.headings) {
    if (/[;\u2014\u2013]/.test(heading)) {
      warnings.push(`Semicolon or dash in a heading: ${heading}`);
    }
  }
  const cells = page.tableText.replace(/`[^`\n]+`/g, 'Code');
  const joinedCells = (cells.match(/[^|\n]*[;\u2014][^|\n]*/g) ?? []).length;
  if (joinedCells > 0) {
    warnings.push(`${joinedCells} table cell(s) join two facts with a semicolon or a dash. Make them two sentences.`);
  }
  for (const aside of page.untitledAsides) {
    warnings.push(`Aside with no title: ${aside}`);
  }
  const british = [...new Set((`${page.text}\n${cells}`.match(BRITISH) ?? []).filter(isBritish))];
  if (british.length > 0) {
    warnings.push(`British spelling: ${british.join(', ')}`);
  }
  const thisMeans = (page.text.match(/\bThis means\b/g) ?? []).length;
  if (thisMeans > MAX_THIS_MEANS) {
    warnings.push(`"This means" ${thisMeans} times. Let the order of the sentences carry the logic.`);
  }
  for (const [opener, total] of count(page.openers)) {
    if (total > 1) {
      warnings.push(`${total} sample explanations open with "${opener}". Start each from a name in its sample.`);
    }
  }

  let wordCount = 0;
  let sentenceCount = 0;
  for (const paragraph of paragraphs(page.text)) {
    // A list is one paragraph in markdown; each item is its own unit here.
    const units = /^\s*(?:[-*]|\d+\.)\s/m.test(paragraph) ? paragraph.split(/\n\s*(?=(?:[-*]|\d+\.)\s)/) : [paragraph];
    for (const unit of units) {
      const unitSentences = sentences(unit.replace(/^\s*(?:[-*]|\d+\.)\s+/, ''));
      if (unitSentences.length > MAX_PARAGRAPH_SENTENCES) {
        warnings.push(`Paragraph of ${unitSentences.length} sentences: "${unitSentences[0].slice(0, 60)}..."`);
      }
      for (const sentence of unitSentences) {
        const words = sentence.split(' ').length;
        wordCount += words;
        sentenceCount += 1;
        if (words > MAX_SENTENCE_WORDS) {
          warnings.push(`Sentence of ${words} words: "${sentence.slice(0, 60)}..."`);
        }
        if (/;/.test(sentence)) {
          warnings.push(`Semicolon: "${sentence.slice(0, 60)}..."`);
        }
      }
    }
  }

  if (!isTutorial) {
    const lines = page.prose.split('\n');
    lines.forEach((line, index) => {
      const isSample = /<Snippet\b/.test(line) || (line === CODE && lines[index - 1] !== CODE);
      // The import line and sample that open an API page stand for the page itself.
      if (!isSample || index < page.firstHeadingLine) {
        return;
      }
      // A wrapper tag such as a tab or a comparison column is not the lead-in.
      const before = lines
        .slice(0, index)
        .filter((previous) => previous.trim() && previous !== CODE && !/^\s*<[^>]+>\s*$/.test(previous))
        .slice(-1)[0];
      if (before !== undefined && !/^\*\*Example\*\*|:\s*(<SpecCite[^>]*>\s*)*$/.test(before.trim())) {
        warnings.push(`Sample with no label or lead-in after: "${before.trim().slice(0, 60)}..."`);
      }
    });
  }

  const you = (lower.match(/\byou(r|'ll|'re|'ve)?\b/g) ?? []).length;
  const metrics = {
    words: wordCount,
    meanSentence: sentenceCount ? (wordCount / sentenceCount).toFixed(1) : '0',
    youPer1k: wordCount ? ((you * 1000) / wordCount).toFixed(1) : '0',
  };
  return { errors, warnings, metrics };
};

const checkFixed = (before, after) => {
  const errors = [];
  const warnings = [];
  if (before.frontmatter !== after.frontmatter) {
    errors.push('Frontmatter changed.');
  }
  const importDiff = diffCounts(
    before.imports.filter((line) => !isAsideOnlyImport(line)).map(normalizeImport),
    after.imports.filter((line) => !isAsideOnlyImport(line)).map(normalizeImport),
  );
  if (importDiff.length > 0) {
    errors.push(`Imports changed:\n    ${importDiff.join('\n    ')}`);
  }
  for (const [label, key] of [
    ['Code blocks', 'fences'],
    ['Components', 'components'],
    // A row is known by its first cell. The wording of the other cells may change.
    ['Table rows', 'tableKeys'],
  ]) {
    const diff = diffCounts(before[key], after[key]);
    if (diff.length > 0) {
      errors.push(`${label} changed:\n    ${diff.map((line) => line.split('\n')[0].slice(0, 140)).join('\n    ')}`);
    }
  }
  if (before.headings.join('\n') !== after.headings.join('\n')) {
    errors.push(`Headings changed:\n    ${diffCounts(before.headings, after.headings).join('\n    ') || '(order)'}`);
  }
  const missing = (key) => [...before[key]].filter((item) => !after[key].has(item));
  if (missing('links').length > 0) {
    errors.push(`Links dropped: ${missing('links').join(', ')}`);
  }
  if (missing('codeSpans').length > 0) {
    warnings.push(`Identifiers no longer mentioned: ${missing('codeSpans').join(' ')}`);
  }
  if (missing('numbers').length > 0) {
    warnings.push(`Numbers no longer mentioned: ${missing('numbers').join(', ')}`);
  }
  return { errors, warnings };
};

let failed = 0;
for (const file of targets) {
  const name = relative(repoRoot, file);
  const after = parse(readFileSync(file, 'utf8'));
  const beforeText = voiceOnly ? undefined : baseText(file);
  // Numbered steps introduce their own samples.
  const isTutorial = /\/learn\/|\/tutorial\.mdx$/.test(name) || after.prose.includes('<Steps>');
  const voice = checkVoice(after, isTutorial);
  const fixed =
    voiceOnly || beforeText === undefined ? { errors: [], warnings: [] } : checkFixed(parse(beforeText), after);
  const errors = [...fixed.errors, ...voice.errors];
  const warnings = [...fixed.warnings, ...voice.warnings];
  if (errors.length > 0) {
    failed += 1;
  }
  if (quiet && errors.length === 0) {
    continue;
  }
  const { words, meanSentence, youPer1k } = voice.metrics;
  console.log(
    `${errors.length > 0 ? 'FAIL' : 'ok  '} ${name}  (${words} words, ${meanSentence} words/sentence, ${youPer1k} "you"/1k)`,
  );
  for (const error of errors) {
    console.log(`  error: ${error}`);
  }
  if (!quiet) {
    for (const warning of warnings) {
      console.log(`  warn:  ${warning}`);
    }
  }
}

console.log(`\n${targets.length} page(s), ${failed} failed.`);
process.exit(failed > 0 ? 1 : 0);
