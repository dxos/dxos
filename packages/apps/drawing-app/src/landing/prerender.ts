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

export type Prerendered = {
  /** Placeholder to the HTML that replaces it. */
  readonly slots: Readonly<Record<string, string>>;
  /** The hero drawing as a `.dx.svg`, served so the download works before the editor loads. */
  readonly file: { readonly fileName: string; readonly svg: string };
};

/**
 * Renders every diagram on the page with this package's own `render`, so each picture is real engine output and
 * the page shows a drawing on first paint and without JavaScript.
 */
export const prerender = async (directory: string): Promise<Prerendered> => {
  const hero = await renderOrThrow(directory, HERO);
  const { markup, cols, rows } = inline(hero.svg, { prefix: 'h', label: `${HERO} diagram`, className: 'hero-diagram' });
  const rendered = await Promise.all(RELATIONS.map(([key]) => renderOrThrow(directory, `rel-${key}`)));
  const sizes = rendered.map(({ svg }, index) => inline(svg, { prefix: `r${index}`, label: '' }));
  const minCols = Math.max(...sizes.map(({ cols }) => cols));
  const minRows = Math.max(...sizes.map(({ rows }) => rows));
  const relations = RELATIONS.map(([key, code, text], index) => {
    const relation = inline(rendered[index].svg, { prefix: `r${index}`, label: `${key} relation`, minCols, minRows });
    return `<div class="relation"><code>${escapeHtml(code)}</code><p>${escapeHtml(text)}</p>${relation.markup}</div>`;
  });

  return {
    slots: {
      '{{SOURCE}}': highlight(hero.source),
      '{{REPORT}}': reportHtml(HERO, hero.report),
      '{{HERO}}': stageHtml(markup, cols, rows),
      '{{RELATIONS}}': relations.join(''),
    },
    file: { fileName: fileName(HERO), svg: hero.svg },
  };
};
