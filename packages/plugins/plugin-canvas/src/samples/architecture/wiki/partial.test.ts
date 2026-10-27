//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';

import { type Wiki } from './model.ts';
import { makeWiki } from './partial.ts';
import { WIKI } from './wiki.ts';

const WIKI_FIXTURE: Wiki = {
  intro: 'The feature map.',
  areas: [
    {
      name: 'Apps',
      pages: [
        {
          path: 'apps/APP.mdl',
          title: 'App',
          summary: 'The app | its shell.',
          features: [{ id: 'app', title: 'App', status: 'in-progress' }],
          content: 'Uses {{spec:plugins/A.mdl}} and {{spec:gone/B.mdl}}.',
        },
      ],
    },
    {
      name: 'Composer plugins',
      pages: [{ path: 'plugins/A.mdl', title: 'A', summary: 'A plugin.', features: [], content: 'A body.' }],
    },
  ],
};

const textOf = (doc: { content: { target?: { content: string } } }) => doc.content.target?.content ?? '';

describe('wiki partial', () => {
  test('pages link each other by id, and the index links every page and embeds the overview', ({ expect }) => {
    const drawing = (name: string) => Drawing.make({ name, canvas: Drawing.makeCanvas({ schema: 'dxos.org/scene' }) });
    const overview = drawing('Overview');
    const plugins = drawing('Plugin Anatomy');
    const drawings = new Map([
      ['composer', overview],
      ['composer-plugin', plugins],
    ]);
    const { index, pages, deck } = makeWiki(WIKI_FIXTURE, drawings);

    const app = pages.get('apps/APP.mdl');
    const plugin = pages.get('plugins/A.mdl');
    expect(app?.name).toBe('App');
    const appText = app ? textOf(app) : '';
    expect(appText).toContain(`Uses [A](echo:///${plugin?.id}) and \`gone/B.mdl\`.`);
    expect(appText).toContain('| App (`app`) | in-progress |');
    expect(appText).toContain('Source: [`apps/APP.mdl`](https://github.com/dxos/dxos/blob/main/apps/APP.mdl)');

    const indexText = textOf(index);
    expect(indexText).toContain(`![Composer architecture](echo:///${overview.id})`);
    expect(indexText).toContain(`![Composer plugins](echo:///${plugins.id})`);
    expect(indexText).toContain(`| [App](echo:///${app?.id}) | in-progress | The app \\| its shell. |`);
    expect(indexText).toContain(`| [A](echo:///${plugin?.id}) | uncited | A plugin. |`);

    // A cover and one slide per area.
    expect(deck.slides).toHaveLength(3);
    expect(Obj.getLabel(deck)).toBe('DXOS feature map');
  });

  test('the generated wiki builds a document for every page', ({ expect }) => {
    const { pages } = makeWiki(WIKI, new Map());
    expect(pages.size).toBe(WIKI.areas.reduce((count, area) => count + area.pages.length, 0));
  });
});
