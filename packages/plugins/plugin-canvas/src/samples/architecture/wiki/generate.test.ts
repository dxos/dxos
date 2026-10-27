//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { trim } from '@dxos/util';

import {
  OTHER_AREA,
  absolutizeLinks,
  buildWiki,
  parseFeatureMap,
  reflow,
  specToPage,
  summarizeMdl,
} from './generate.ts';
import { Wiki } from './model.ts';
import wiki from './wiki.json?raw';

const FENCE = '```';

const FEATURE_MAP = trim`
  ---
  id: org.dxos.features
  name: Feature map
  ---

  The feature map is the top of the chain
  that turns intent into code.

  ## Extensions

  | Term | URI |
  | --- | --- |

  ## Features

  ### Apps

  ${FENCE}mdl
  feature app: Composer
    status: in-progress
    specs: [packages/apps/app/APP.mdl]
  ${FENCE}

  ### Plugins

  ${FENCE}mdl
  feature plugin-a: APlugin
    status: operational
    specs: [packages/plugins/plugin-a/PLUGIN.mdl]
  ${FENCE}

  ${FENCE}mdl
  feature plugin-a.extra: A extra
    status: planned
    specs: [packages/plugins/plugin-a/PLUGIN.mdl#F-2, packages/plugins/plugin-gone/PLUGIN.mdl]
    depends: [plugin-a]
  ${FENCE}

  ## Changelog

  ${FENCE}mdl
  decision D-1: Not a feature
  ${FENCE}
`;

const PLUGIN_A = trim`
  ---
  id: org.dxos.plugin.a
  name: APlugin
  ---

  The A plugin edits things
  across two lines. It also does more.

  ## Extensions

  | Term | URI |
  | --- | --- |
  | \`op\` | \`org.dxos.mdl.op@1.1\` |

  ## Types

  ${FENCE}mdl
  type Thing
    desc: |
      A thing the plugin stores. Second sentence.
    fields:
      name: string
  ${FENCE}

  ## Features

  ${FENCE}mdl
  feat F-1: Edit things

    req F-1.1: Opens a thing.
    req F-1.2:
      when: user clicks
      then: it opens
  ${FENCE}

  See \`packages/apps/app/APP.mdl\` and \`packages/plugins/plugin-b/PLUGIN.mdl\`.

  ${FENCE}ts
  const x = 1;
  ${FENCE}

  ## Changelog

  ${FENCE}mdl
  decision D-1: Started
  ${FENCE}
`;

const SPECS = new Map([
  ['packages/apps/app/APP.mdl', '# Composer app\n\nThe app.\n'],
  ['packages/plugins/plugin-a/PLUGIN.mdl', PLUGIN_A],
  ['packages/plugins/plugin-z/SPEC.mdl', '---\nname: Zed\n---\n\nUncited.\n'],
]);

describe('generate wiki', () => {
  test('reflow joins wrapped prose but keeps list items, tables and headings apart', ({ expect }) => {
    expect(reflow('one\ntwo\n\n- a\n  b\n- c\n\n| x |\n| y |\n## H\nnext\n```\ncode\nlines\n```')).toBe(
      'one two\n\n- a b\n- c\n\n| x |\n| y |\n## H\nnext\n```\ncode\nlines\n```',
    );
  });

  test('absolutizeLinks points relative links and images at GitHub and leaves code and absolute links alone', ({
    expect,
  }) => {
    expect(
      absolutizeLinks(
        '![Pipeline](diagrams/a.dx.svg) [doc](../docs/B.md) [web](https://x.org) [top](#t)\n```\n[x](y)\n```',
        'packages/a/spec/S.mdl',
      ),
    ).toBe(
      '![Pipeline](https://raw.githubusercontent.com/dxos/dxos/main/packages/a/spec/diagrams/a.dx.svg) ' +
        '[doc](https://github.com/dxos/dxos/blob/main/packages/a/docs/B.md) [web](https://x.org) [top](#t)\n```\n[x](y)\n```',
    );
  });

  test('summarizeMdl reduces each block to a bullet and nests requirements', ({ expect }) => {
    expect(
      summarizeMdl(
        'feat F-1: Edit\n\n  req F-1.1: Opens.\n  req F-1.2:\n    when: a\n    then: b\ntype T\n  desc: Typed. More.',
      ),
    ).toEqual(['- **feat** `F-1` Edit', '  - `F-1.1` Opens.', '  - `F-1.2` a → b', '- **type** `T` Typed.']);
  });

  test('parseFeatureMap reads areas, statuses and spec paths without item suffixes', ({ expect }) => {
    const map = parseFeatureMap(FEATURE_MAP);
    expect(map.intro).toBe('The feature map is the top of the chain that turns intent into code.');
    expect(map.areas).toEqual(['Apps', 'Plugins']);
    expect(map.features.map(({ id, area, status, specs }) => ({ id, area, status, specs }))).toEqual([
      { id: 'app', area: 'Apps', status: 'in-progress', specs: ['packages/apps/app/APP.mdl'] },
      { id: 'plugin-a', area: 'Plugins', status: 'operational', specs: ['packages/plugins/plugin-a/PLUGIN.mdl'] },
      {
        id: 'plugin-a.extra',
        area: 'Plugins',
        status: 'planned',
        specs: ['packages/plugins/plugin-a/PLUGIN.mdl', 'packages/plugins/plugin-gone/PLUGIN.mdl'],
      },
    ]);
  });

  test('specToPage keeps prose, summarizes blocks, links known specs and drops skipped sections', ({ expect }) => {
    const page = specToPage({
      path: 'packages/plugins/plugin-a/PLUGIN.mdl',
      text: PLUGIN_A,
      features: [],
      paths: new Set(SPECS.keys()),
    });
    expect(page.title).toBe('APlugin');
    expect(page.summary).toBe('The A plugin edits things across two lines.');
    expect(page.content).toContain('- **type** `Thing` A thing the plugin stores.');
    expect(page.content).toContain('  - `F-1.2` user clicks → it opens');
    expect(page.content).toContain(
      'See {{spec:packages/apps/app/APP.mdl}} and `packages/plugins/plugin-b/PLUGIN.mdl`.',
    );
    expect(page.content).toContain('```ts\nconst x = 1;\n```');
    expect(page.content).not.toContain('Extensions');
    expect(page.content).not.toContain('Changelog');
    expect(page.content).not.toContain('D-1');
  });

  test('buildWiki groups pages by area, files uncited specs last and reports missing ones', ({ expect }) => {
    const { wiki, missing } = buildWiki({ featureMap: FEATURE_MAP, specs: SPECS });
    expect(wiki.areas.map(({ name, pages }) => [name, pages.map(({ title }) => title)])).toEqual([
      ['Apps', ['Composer app']],
      ['Plugins', ['APlugin']],
      [OTHER_AREA, ['Zed']],
    ]);
    expect(wiki.areas[1].pages[0].features.map(({ id }) => id)).toEqual(['plugin-a', 'plugin-a.extra']);
    expect(missing).toEqual(['packages/plugins/plugin-gone/PLUGIN.mdl']);
    expect(Schema.decodeUnknownSync(Wiki)(wiki)).toEqual(wiki);
  });

  test('the committed wiki.json decodes, and every page body is one line per paragraph', ({ expect }) => {
    const committed = Schema.decodeUnknownSync(Wiki)(JSON.parse(wiki));
    const pages = committed.areas.flatMap(({ pages }) => pages);
    expect(pages.length).toBeGreaterThan(0);
    expect(new Set(pages.map(({ path }) => path)).size).toBe(pages.length);
    // A reflow that changes nothing means no paragraph is still hard-wrapped.
    expect(pages.filter(({ content }) => reflow(content) !== content).map(({ path }) => path)).toEqual([]);
  });
});
