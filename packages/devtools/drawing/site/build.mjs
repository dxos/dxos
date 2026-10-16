//
// Copyright 2026 DXOS.org
//

// Builds the drawing.sh landing page: renders every `.dx` in `diagrams/` with this package's own `render`, so
// each picture on the page is real engine output, inlines them into `template.html`, and writes `dist/`.

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { render } from '../dist/src/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(here, 'dist');

const escape = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The source with keywords and strings marked for the page's code colours. */
const highlight = (source) =>
  source
    .trimEnd()
    .split('\n')
    .map((line) =>
      escape(line)
        .replace(/(&quot;[^&]*&quot;)/g, '<span class="str">$1</span>')
        .replace(/^(\s*)(diagram|group|node|edge)\b/, '$1<span class="kw">$2</span>'),
    )
    .join('\n');

/**
 * A rendered diagram ready to inline: the file's stylesheet dropped (the page themes the renderer's classes),
 * its fixed size dropped so CSS sizes it, and its marker ids prefixed so several diagrams can share the page.
 */
const inline = async (name, prefix, className = '') => {
  const source = readFileSync(path.join(here, 'diagrams', `${name}.dx`), 'utf8');
  const { svg, report } = await render(source, { name, plain: true });
  if (report.failed) {
    throw new Error(`${name}.dx: ${report.notes.map(({ message }) => message).join('; ')}`);
  }
  const markup = svg
    .replace(/<style>[\s\S]*?<\/style>/, '')
    .replace(/ width="[^"]*" height="[^"]*"/, '')
    .replaceAll('id="dx-', `id="${prefix}-`)
    .replaceAll('url(#dx-', `url(#${prefix}-`)
    .replace('class="dx-fill', `role="img" aria-label="${name} diagram" class="diagram ${className} dx-fill`);
  return { source, report, markup };
};

const RELATIONS = [
  ['extends', 'edge Dog extends Animal', 'a subtype, with a hollow triangle'],
  ['implements', 'edge Store implements Readable', 'a contract, dashed'],
  ['composes', 'edge Car composes Engine', 'a part that lives and dies with the whole'],
  ['owns', 'edge Team owns Player', 'a part that can outlive the whole'],
  ['depends-on', 'edge App depends-on Logger', 'a dependency, dashed with an open arrow'],
  ['one-to-many', 'edge Customer one-to-many Order', "cardinality, with a crow's foot"],
];

const plural = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`;

const hero = await inline('arch', 'h', 'hero-diagram');
const { nodes, connectors, crossings, bends } = hero.report;
const report = [
  '<b>$ drawing render arch.dx</b>',
  `${plural(nodes, 'node')}, ${plural(connectors, 'connector')}`,
  `${plural(crossings, 'crossing')}, ${plural(bends, 'bend')}`,
  'wrote arch.dx.svg',
].join('<br />\n');

const relations = [];
for (const [index, [key, code, text]] of RELATIONS.entries()) {
  const { markup } = await inline(`rel-${key}`, `r${index}`);
  relations.push(`<div class="relation"><code>${escape(code)}</code><p>${escape(text)}</p>${markup}</div>`);
}

const page = readFileSync(path.join(here, 'template.html'), 'utf8')
  .replace('{{SOURCE}}', highlight(hero.source))
  .replace('{{REPORT}}', report)
  .replace('{{HERO}}', hero.markup)
  .replace('{{RELATIONS}}', relations.join(''));

mkdirSync(dist, { recursive: true });
writeFileSync(path.join(dist, 'index.html'), page);
copyFileSync(path.join(here, 'favicon.svg'), path.join(dist, 'favicon.svg'));
console.log(`wrote ${path.relative(process.cwd(), path.join(dist, 'index.html'))} (${page.length} bytes)`);
