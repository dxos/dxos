//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { EID, type Obj } from '@dxos/echo';
import * as Presentation from '@dxos/plugin-presenter/Presentation';

import { SPEC_LINK, Wiki, type WikiArea, type WikiFeature, type WikiPage } from './model.ts';
import wiki from './wiki.json?raw';

/** The wiki as last generated from the repository's specs (`scripts/generate-wiki.ts`). */
export const WIKI: Wiki = Schema.decodeUnknownSync(Wiki)(JSON.parse(wiki));

/** Each page's document, by spec path, and the drawings an area heading embeds, by area name. */
export type WikiObjects = {
  readonly pages: ReadonlyMap<string, Obj.Unknown>;
  readonly areaDrawings: ReadonlyMap<string, Obj.Unknown>;
  readonly overview?: Obj.Unknown;
};

/** Feature-map areas that one of the architecture diagrams draws, by diagram id. */
export const AREA_DIAGRAMS: Readonly<Record<string, string>> = {
  'Apps': 'composer',
  'ECHO and HALO': 'echo-model',
  'Composer plugins': 'composer-plugin',
  'SDK and tools': 'composer-framework',
};

const GITHUB = 'https://github.com/dxos/dxos/blob/main';

// Space-relative URIs, as the editor writes them, so the links resolve in whatever space the template seeds.
const uri = (object: Obj.Unknown) => EID.make({ entityId: object.id });

const cell = (text: string) => text.replaceAll('|', '\\|');

const statusOf = (features: ReadonlyArray<WikiFeature>): string =>
  [...new Set(features.map(({ status }) => status ?? 'unknown'))].join(', ') || 'uncited';

/** A page's body with each `{{spec:<path>}}` linked to that spec's page, or left as code when it has none. */
export const resolveLinks = (content: string, objects: WikiObjects, pagesByPath: ReadonlyMap<string, WikiPage>) =>
  content.replace(SPEC_LINK, (_placeholder, path: string) => {
    const object = objects.pages.get(path);
    const page = pagesByPath.get(path);
    return object && page ? `[${page.title}](${uri(object)})` : `\`${path}\``;
  });

/** One spec's page: its features and source, then the spec's own prose. */
export const pageContent = (
  page: WikiPage,
  objects: WikiObjects,
  pagesByPath: ReadonlyMap<string, WikiPage>,
): string => {
  const features =
    page.features.length > 0
      ? [
          '| Feature | Status |',
          '| --- | --- |',
          ...page.features.map(({ id, title, status }) => `| ${cell(title)} (\`${id}\`) | ${status ?? 'unknown'} |`),
          '',
        ]
      : [];
  return [
    ...features,
    `Source: [\`${page.path}\`](${GITHUB}/${page.path})`,
    '',
    resolveLinks(page.content, objects, pagesByPath),
    '',
  ].join('\n');
};

/** The wiki's front page: the feature map's intro, the overview drawing, then each area's pages as a table. */
export const indexContent = (data: Wiki, objects: WikiObjects): string => {
  const lines = [
    `${data.intro}`,
    '',
    "This wiki is generated from the repository: one page per spec (`PLUGIN.mdl`, `SPEC.mdl` and the specs `FEATURES.mdl` cites), grouped by the feature map's areas. Regenerate it with the `architecture-wiki` routine (`agents/routines/architecture-wiki.md`).",
    '',
    ...(objects.overview ? [`![Composer architecture](${uri(objects.overview)})`, ''] : []),
  ];
  for (const area of data.areas) {
    lines.push(`## ${area.name}`, '');
    const drawing = objects.areaDrawings.get(area.name);
    if (drawing) {
      lines.push(`![${area.name}](${uri(drawing)})`, '');
    }
    lines.push('| Page | Status | Summary |', '| --- | --- | --- |');
    for (const page of area.pages) {
      const object = objects.pages.get(page.path);
      const title = object ? `[${cell(page.title)}](${uri(object)})` : cell(page.title);
      lines.push(`| ${title} | ${statusOf(page.features)} | ${cell(page.summary)} |`);
    }
    lines.push('');
  }
  return lines.join('\n');
};

/** How many of an area's features are at each status, most common first. */
export const statusCounts = (area: WikiArea): Array<readonly [status: string, count: number]> => {
  const features = new Map(area.pages.flatMap(({ features }) => features.map((feature) => [feature.id, feature])));
  const counts = new Map<string, number>();
  for (const { status } of features.values()) {
    counts.set(status ?? 'unknown', (counts.get(status ?? 'unknown') ?? 0) + 1);
  }
  return [...counts].sort(([, left], [, right]) => right - left);
};

/** Features a slide lists before it summarizes the rest as a count. */
const SLIDE_FEATURES = 8;

/** The feature map as a deck: a cover, then one slide per area with its status tally and leading features. */
export const makeFeatureDeck = (data: Wiki): Presentation.Presentation => {
  const cover = [
    '---',
    'layout: cover',
    '---',
    '',
    '# The DXOS feature map',
    '',
    `${data.areas.reduce((count, area) => count + area.pages.length, 0)} specs across ${data.areas.length} areas, generated from \`FEATURES.mdl\`.`,
  ].join('\n');
  const slides = data.areas.map((area) => {
    const titles = [...new Set(area.pages.map(({ title }) => title))];
    const listed = titles.slice(0, SLIDE_FEATURES).map((title) => `- ${title}`);
    const rest = titles.length - listed.length;
    return [
      `# ${area.name}`,
      '',
      '| Status | Features |',
      '| --- | --- |',
      ...statusCounts(area).map(([status, count]) => `| ${status} | ${count} |`),
      '',
      ...listed,
      ...(rest > 0 ? [`- and ${rest} more`] : []),
    ].join('\n');
  });
  return Presentation.makeFromMarkdown({
    name: 'DXOS feature map',
    description: 'Each area of the DXOS feature map: how many of its features are at each status, and its specs.',
    markdown: [cover, ...slides].join('\n\n---\n\n'),
  });
};
