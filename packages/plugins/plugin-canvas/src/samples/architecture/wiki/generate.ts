//
// Copyright 2026 DXOS.org
//

// Pure and dependency-free so `generate-wiki.ts` runs under plain `node` without a build.
import type { Wiki, WikiArea, WikiFeature, WikiPage } from './model.ts';

/** A `feature` block of the feature map, with the `### <area>` it sits under. */
export type MapFeature = WikiFeature & {
  readonly area: string;
  /** Repo-relative spec paths, without a `#<item>` suffix. */
  readonly specs: ReadonlyArray<string>;
};

export type FeatureMap = {
  readonly intro: string;
  readonly areas: ReadonlyArray<string>;
  readonly features: ReadonlyArray<MapFeature>;
};

/** Area for specs no feature cites. */
export const OTHER_AREA = 'Other specs';

/** Sections a reader of the wiki does not need: dialect tables, decision logs and appendices. */
const SKIPPED_SECTION = /^(extensions|changelog|appendix)\b/i;

const FENCE = /^(`{3,}|~{3,})\s*([\w-]*)/;

/** A line that starts its own markdown element, so a reflow must not join it to the line before. */
const BLOCK_START = /^(#{1,6}\s|\||>|[-*+]\s|\d+[.)]\s|<)/;

const SUMMARY_LENGTH = 280;
const DESC_LENGTH = 220;

/** Splits YAML-ish frontmatter (`key: value` lines between `---` fences) from the body. */
export const parseFrontmatter = (text: string): { fields: Record<string, string>; body: string } => {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!match) {
    return { fields: {}, body: text };
  }
  const fields: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const field = /^([\w-]+):\s*(.*)$/.exec(line);
    if (field) {
      fields[field[1]] = field[2].trim();
    }
  }
  return { fields, body: text.slice(match[0].length) };
};

/** A run of lines that is either all inside one fence or all outside, so prose transforms never touch code. */
type Run = { readonly fenced: boolean; readonly language: string; readonly lines: string[] };

/** A closing fence is the opening marker's character, at least as many times, and nothing else. */
const closesFence = (line: string, marker: string): boolean => {
  const trimmed = line.trim();
  return trimmed.length >= marker.length && [...trimmed].every((char) => char === marker[0]);
};

const splitRuns = (text: string): Run[] => {
  const runs: Run[] = [];
  let current: Run = { fenced: false, language: '', lines: [] };
  let marker: string | undefined;
  for (const line of text.split('\n')) {
    const fence = FENCE.exec(line);
    if (marker === undefined && fence) {
      runs.push(current);
      marker = fence[1];
      current = { fenced: true, language: fence[2], lines: [] };
    } else if (marker !== undefined && closesFence(line, marker)) {
      runs.push(current);
      marker = undefined;
      current = { fenced: false, language: '', lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  runs.push(current);
  return runs.filter((run) => run.fenced || run.lines.length > 0);
};

/**
 * Joins hard-wrapped prose into one line per paragraph or list item, since the editor renders a line break inside a
 * paragraph as a break.
 */
export const reflow = (text: string): string => {
  const out: string[] = [];
  let marker: string | undefined;
  for (const line of text.split('\n')) {
    const fence = FENCE.exec(line.trim());
    if (marker !== undefined || fence) {
      // Code keeps its lines; the fence lines themselves never join the prose around them.
      out.push(line);
      if (marker === undefined && fence) {
        marker = fence[1];
      } else if (marker !== undefined && closesFence(line, marker)) {
        marker = undefined;
      }
      continue;
    }
    const trimmed = line.trim();
    const previous = out.length > 0 ? out[out.length - 1] : undefined;
    const joinable =
      trimmed.length > 0 &&
      previous !== undefined &&
      previous.trim().length > 0 &&
      !FENCE.test(previous.trim()) &&
      !BLOCK_START.test(trimmed) &&
      !/^\s*\|/.test(previous) &&
      !/^#{1,6}\s/.test(previous.trim());
    if (joinable) {
      out[out.length - 1] = `${previous.trimEnd()} ${trimmed}`;
    } else {
      out.push(trimmed.length === 0 ? '' : line.trimEnd());
    }
  }
  return out.join('\n');
};

const firstSentence = (text: string, length: number): string => {
  const flat = text.replace(/\s+/g, ' ').trim();
  const sentence = /^(.+?[.!?])(\s|$)/.exec(flat)?.[1] ?? flat;
  return sentence.length > length ? `${sentence.slice(0, length - 1).trimEnd()}…` : sentence;
};

/** The value of `field:` in an indented block body, following a `|` or `>` onto its more-indented lines. */
const blockField = (lines: ReadonlyArray<string>, field: string): string | undefined => {
  for (let index = 0; index < lines.length; index++) {
    const match = new RegExp(`^(\\s+)${field}:\\s*(.*)$`).exec(lines[index]);
    if (!match) {
      continue;
    }
    if (match[2] !== '|' && match[2] !== '>' && match[2] !== '') {
      return match[2];
    }
    const indent = match[1].length;
    const continuation: string[] = [];
    for (const next of lines.slice(index + 1)) {
      if (next.trim().length > 0 && next.length - next.trimStart().length <= indent) {
        break;
      }
      continuation.push(next.trim());
    }
    return continuation.join(' ').trim() || undefined;
  }
  return undefined;
};

const BLOCK_HEADER = /^([a-z][\w-]*)\s+([^\s:]+)(?::\s*(.*))?$/;
const REQUIREMENT = /^(\s+)req\s+([^\s:]+):\s*(.*)$/;

/** Reduces an `mdl` fence to one bullet per block, with a feature's requirements nested under it. */
export const summarizeMdl = (source: string): string[] => {
  const lines = source.split('\n');
  const bullets: string[] = [];
  let index = 0;
  while (index < lines.length) {
    const header = BLOCK_HEADER.exec(lines[index]);
    if (!header) {
      index++;
      continue;
    }
    let end = index + 1;
    while (end < lines.length && !BLOCK_HEADER.test(lines[end])) {
      end++;
    }
    const body = lines.slice(index + 1, end);
    const [, type, id, title] = header;
    const desc = blockField(body, 'desc') ?? blockField(body, 'note') ?? blockField(body, 'why');
    const label = [title?.trim(), desc && firstSentence(desc, DESC_LENGTH)].filter(Boolean).join(' — ');
    bullets.push(`- **${type}** \`${id}\`${label ? ` ${label}` : ''}`);
    for (let line = 0; line < body.length; line++) {
      const requirement = REQUIREMENT.exec(body[line]);
      if (!requirement) {
        continue;
      }
      const rest = body.slice(line + 1);
      const text =
        requirement[3].trim() ||
        [blockField(rest.slice(0, 3), 'when'), blockField(rest.slice(0, 3), 'then')].filter(Boolean).join(' → ');
      bullets.push(`  - \`${requirement[2]}\` ${firstSentence(text, DESC_LENGTH)}`.trimEnd());
    }
    index = end;
  }
  return bullets;
};

/** The `feature` blocks of `FEATURES.mdl`, each with the `### <area>` heading above it. */
export const parseFeatureMap = (text: string): FeatureMap => {
  const { body } = parseFrontmatter(text);
  const intro = reflow(body.split(/^## /m)[0]).trim().split('\n\n')[0] ?? '';
  const areas: string[] = [];
  const features: MapFeature[] = [];
  let area: string | undefined;
  for (const run of splitRuns(body)) {
    if (!run.fenced) {
      for (const line of run.lines) {
        const heading = /^(#{2,3})\s+(.*)$/.exec(line);
        if (heading?.[1] === '###') {
          area = heading[2].trim();
          areas.push(area);
        } else if (heading) {
          area = undefined;
        }
      }
      continue;
    }
    if (run.language !== 'mdl' || area === undefined) {
      continue;
    }
    const lines = run.lines;
    for (let index = 0; index < lines.length; index++) {
      const header = /^feature\s+([^\s:]+):\s*(.*)$/.exec(lines[index]);
      if (!header) {
        continue;
      }
      let end = index + 1;
      while (end < lines.length && !BLOCK_HEADER.test(lines[end])) {
        end++;
      }
      const block = lines.slice(index + 1, end);
      const specs = (blockField(block, 'specs') ?? '')
        .replace(/^\[|\]$/g, '')
        .split(',')
        .map((spec) => spec.trim().split('#')[0])
        .filter((spec) => spec.length > 0);
      features.push({ id: header[1], title: header[2].trim(), status: blockField(block, 'status'), area, specs });
    }
  }
  return { intro, areas, features };
};

/** Backticked spec paths the wiki has a page for become `{{spec:<path>}}` placeholders. */
const linkSpecs = (text: string, paths: ReadonlySet<string>): string =>
  text.replace(/`([^`\s]+\.mdl)(#[^`\s]*)?`/g, (match, path: string) => (paths.has(path) ? `{{spec:${path}}}` : match));

const GITHUB_BLOB = 'https://github.com/dxos/dxos/blob/main';
const GITHUB_RAW = 'https://raw.githubusercontent.com/dxos/dxos/main';

const ABSOLUTE = /^([a-z][\w+.-]*:|#|\/|\{\{)/i;

/**
 * Points a spec's relative links at GitHub, and its relative images (the rendered `.dx.svg` diagrams) at the raw
 * file, since a wiki page in a space has no repository beside it; fenced code is left alone.
 */
export const absolutizeLinks = (markdown: string, specPath: string): string => {
  const dir = specPath.split('/').slice(0, -1);
  const resolve = (target: string) => {
    const parts = [...dir];
    for (const part of target.split('/')) {
      if (part === '..') {
        parts.pop();
      } else if (part !== '.' && part !== '') {
        parts.push(part);
      }
    }
    return parts.join('/');
  };
  return splitRuns(markdown)
    .map((run) =>
      run.fenced
        ? ['```' + run.language, ...run.lines, '```'].join('\n')
        : run.lines
            .join('\n')
            .replace(/(!?)\[([^\]]*)\]\(([^)\s]+)\)/g, (match, bang: string, label: string, target: string) =>
              ABSOLUTE.test(target)
                ? match
                : `${bang}[${label}](${bang ? GITHUB_RAW : GITHUB_BLOB}/${resolve(target)})`,
            ),
    )
    .join('\n');
};

/** One spec rendered as a wiki page. */
export const specToPage = (options: {
  readonly path: string;
  readonly text: string;
  readonly features: ReadonlyArray<WikiFeature>;
  readonly paths: ReadonlySet<string>;
}): WikiPage => {
  const { fields, body } = parseFrontmatter(options.text);
  const out: string[] = [];
  let title = fields.name;
  let skipping = false;
  for (const run of splitRuns(body)) {
    if (run.fenced) {
      if (!skipping) {
        out.push(
          ...(run.language === 'mdl'
            ? summarizeMdl(run.lines.join('\n'))
            : ['```' + run.language, ...run.lines, '```']),
        );
      }
      continue;
    }
    for (const line of run.lines) {
      const heading = /^(#{1,6})\s+(.*)$/.exec(line);
      if (heading?.[1] === '#') {
        title ??= heading[2].trim();
        continue;
      }
      if (heading?.[1] === '##') {
        skipping = SKIPPED_SECTION.test(heading[2].trim());
      }
      if (!skipping) {
        out.push(line);
      }
    }
  }
  const content = absolutizeLinks(linkSpecs(reflow(out.join('\n')), options.paths), options.path)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const lead = content.split(/^#/m)[0].trim().split('\n\n')[0] ?? '';
  return {
    path: options.path,
    title: title ?? options.features[0]?.title ?? options.path.split('/').slice(-2).join('/'),
    summary: firstSentence(lead.replace(/\{\{spec:([^}]+)\}\}/g, '`$1`'), SUMMARY_LENGTH),
    features: options.features,
    content,
  };
};

/**
 * The whole wiki: one area per `### <area>` of the feature map, holding the pages of the specs its features cite in map
 * order, then {@link OTHER_AREA} for specs no feature cites, by path. A cited spec with no source is reported, not
 * paged.
 */
export const buildWiki = (options: {
  readonly featureMap: string;
  readonly specs: ReadonlyMap<string, string>;
}): { wiki: Wiki; missing: string[] } => {
  const map = parseFeatureMap(options.featureMap);
  const paths = new Set(options.specs.keys());
  const placed = new Map<string, string>();
  const featuresBySpec = new Map<string, WikiFeature[]>();
  const missing = new Set<string>();
  for (const { area, specs, ...feature } of map.features) {
    for (const spec of specs) {
      if (!paths.has(spec)) {
        missing.add(spec);
        continue;
      }
      if (!placed.has(spec)) {
        placed.set(spec, area);
      }
      featuresBySpec.set(spec, [...(featuresBySpec.get(spec) ?? []), feature]);
    }
  }
  const page = (path: string): WikiPage =>
    specToPage({ path, text: options.specs.get(path) ?? '', features: featuresBySpec.get(path) ?? [], paths });
  const areas: WikiArea[] = map.areas
    .map((name) => ({ name, pages: [...placed].filter(([, area]) => area === name).map(([path]) => page(path)) }))
    .filter((area) => area.pages.length > 0);
  const others = [...paths].filter((path) => !placed.has(path)).sort();
  if (others.length > 0) {
    areas.push({ name: OTHER_AREA, pages: others.map(page) });
  }
  return { wiki: { intro: map.intro, areas }, missing: [...missing].sort() };
};
