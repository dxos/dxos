//
// Copyright 2026 DXOS.org
//

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { render } from '@dxos/drawing';

import { HERO, escapeHtml, fileName, inline, reportHtml, stageHtml } from './markup.ts';

const RELATIONS = [
  ['extends', 'edge Dog extends Animal', 'a subtype, with a hollow triangle'],
  ['implements', 'edge Socket implements Stream', 'a contract, dashed'],
  ['composes', 'edge Car composes Engine', 'a part that lives and dies with the whole'],
  ['owns', 'edge Team owns Player', 'a part that can outlive the whole'],
  ['depends-on', 'edge App depends-on Logger', 'a dependency, dashed with an open arrow'],
  ['one-to-many', 'edge Author one-to-many Book', "cardinality, with a crow's foot"],
] as const;

/** The source with keywords and strings marked for the page's code colours, shown until the editor loads. */
const highlight = (source: string): string =>
  source
    .trimEnd()
    .split('\n')
    .map((line) =>
      escapeHtml(line)
        .replace(/(&quot;[^&]*&quot;)/g, '<span class="str">$1</span>')
        .replace(/^(\s*)(diagram|group|node|edge)\b/, '$1<span class="kw">$2</span>'),
    )
    .join('\n');

const renderOrThrow = async (directory: string, name: string) => {
  const source = await readFile(path.join(directory, `${name}.dx`), 'utf8');
  const result = await render(source, { name });
  if (result.report.failed) {
    throw new Error(`${name}.dx: ${result.report.notes.map(({ message }) => message).join('; ')}`);
  }
  return { source, ...result };
};

export type Relation = { readonly key: string; readonly code: string; readonly text: string; readonly svg: string };

export type Prerendered = {
  /** The hero's `.dx` source, highlighted, shown until the editor loads. */
  readonly source: string;
  /** The hero render's report. */
  readonly report: string;
  /** The hero drawing on its stage. */
  readonly hero: string;
  /** The relation examples: the statement, what it means, and its drawing. */
  readonly relations: readonly Relation[];
  /** The name the hero drawing renders to, which titles the editor's drawing. */
  readonly fileName: string;
};

/**
 * Renders every diagram on the page with this package's own `render`, so each picture is real engine output and
 * the page shows a drawing on first paint and without JavaScript. Memoized, since every page that shows the editor
 * asks for it.
 */
export const prerender = (directory: string): Promise<Prerendered> => {
  const cached = prerendered.get(directory);
  if (cached) {
    return cached;
  }
  const result = renderPage(directory);
  prerendered.set(directory, result);
  return result;
};

const prerendered = new Map<string, Promise<Prerendered>>();

const renderPage = async (directory: string): Promise<Prerendered> => {
  const hero = await renderOrThrow(directory, HERO);
  const { markup, cols, rows } = inline(hero.svg, { prefix: 'h', label: `${HERO} diagram`, className: 'hero-diagram' });
  const rendered = await Promise.all(RELATIONS.map(([key]) => renderOrThrow(directory, `rel-${key}`)));
  const sizes = rendered.map(({ svg }, index) => inline(svg, { prefix: `r${index}`, label: '' }));
  const minCols = Math.max(...sizes.map(({ cols }) => cols));
  const minRows = Math.max(...sizes.map(({ rows }) => rows));
  const relations = RELATIONS.map(([key, code, text], index) => {
    const relation = inline(rendered[index].svg, { prefix: `r${index}`, label: `${key} relation`, minCols, minRows });
    return { key, code, text, svg: relation.markup };
  });

  return {
    source: highlight(hero.source),
    report: reportHtml(HERO, hero.report),
    hero: stageHtml(markup, cols, rows),
    relations,
    fileName: fileName(HERO),
  };
};
