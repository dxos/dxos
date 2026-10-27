//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Collection, Database, Obj, Ref } from '@dxos/echo';
import type * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as Presentation from '@dxos/plugin-presenter/Presentation';

import { type Wiki, type WikiPage } from './model.ts';
import { AREA_DIAGRAMS, WIKI, indexContent, makeFeatureDeck, pageContent } from './wiki.ts';

export type Requires = {
  /** The architecture partial's drawings, by diagram id; the index embeds the overview and each area's diagram. */
  readonly drawings: ReadonlyMap<string, Drawing.Drawing>;
};

export type Provides = {
  /** The front page, linking every page. */
  readonly index: Markdown.Document;
  /** One document per spec, by repo-relative spec path. */
  readonly pages: ReadonlyMap<string, Markdown.Document>;
  /** The feature map as a deck. */
  readonly deck: Presentation.Presentation;
};

/** Writes `content` into a document made empty, so pages can link each other by id. */
const fill = (doc: Markdown.Document, content: string) => {
  const text = doc.content.target;
  if (text) {
    Obj.update(text, (text) => {
      text.content = content;
    });
  }
};

/** Builds the wiki's objects from generated wiki data; the partial passes {@link WIKI}, tests pass a fixture. */
export const makeWiki = (data: Wiki, drawings: ReadonlyMap<string, Drawing.Drawing>) => {
  const pagesByPath = new Map<string, WikiPage>(
    data.areas.flatMap((area) => area.pages.map((page) => [page.path, page])),
  );
  const pages = new Map([...pagesByPath].map(([path, page]) => [path, Markdown.make({ name: page.title })]));
  const areaDrawings = new Map(
    Object.entries(AREA_DIAGRAMS).flatMap(([area, id]) => {
      const drawing = drawings.get(id);
      return drawing ? [[area, drawing] as const] : [];
    }),
  );
  const objects = { pages, areaDrawings, overview: drawings.get('composer') };
  for (const [path, page] of pagesByPath) {
    const doc = pages.get(path);
    if (doc) {
      fill(doc, pageContent(page, objects, pagesByPath));
    }
  }
  const index = Markdown.make({ name: 'DXOS wiki', content: indexContent(data, objects) });
  return { index, pages, deck: makeFeatureDeck(data) };
};

/** The repository's specs as a wiki: a front page, one document per spec by feature-map area, and a deck. Spec: `CONTENT.md`. */
export const Partial: SampleSpace.Partial<Provides, Requires> = SampleSpace.partial('wiki', {
  schemas: [Markdown.Document, Presentation.Presentation, Presentation.Slide],
  run: ({ drawings }) =>
    Effect.gen(function* () {
      const { index, pages, deck } = makeWiki(WIKI, drawings);
      yield* Database.add(index);
      yield* Database.add(deck);
      const areas = [];
      for (const area of WIKI.areas) {
        const docs = [];
        for (const page of area.pages) {
          const doc = pages.get(page.path);
          if (doc) {
            docs.push(Ref.make(yield* Database.add(doc)));
          }
        }
        areas.push(yield* Database.add(Obj.make(Collection.Collection, { name: area.name, objects: docs })));
      }
      yield* SampleSpace.collection(
        'Wiki',
        [index, deck, ...areas].map((object) => Ref.make(object)),
      );
      return { index, pages, deck };
    }),
});
