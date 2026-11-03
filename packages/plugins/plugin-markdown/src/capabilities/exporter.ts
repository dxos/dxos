//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Obj, Type } from '@dxos/echo';
import { URI } from '@dxos/keys';
import { escapeHtml } from '@dxos/util';

import { Markdown } from '#types';

import { parseEmbedLabel } from '../components/PreviewComponent/parse-embed-label.ts';
import { findEmbeds, placeEmbeds, removeEmbeds } from './print-embeds.ts';

const loadContent = (document: Markdown.Document) =>
  Effect.tryPromise({
    try: () => document.content.load(),
    catch: AppCapabilities.ExportError.wrap(),
  }).pipe(Effect.map((text) => text.content ?? ''));

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    // Documents currently printing, so a document that embeds itself (directly or via another) terminates.
    const printing = new Set<string>();

    /** The embedded object printed by its own type's exporter; `undefined` omits it from the printout. */
    const renderEmbed = (document: Markdown.Document, label: string, eid: string) =>
      Effect.gen(function* () {
        const db = Obj.getDatabase(document);
        if (!db) {
          return undefined;
        }

        const target = yield* Effect.tryPromise(() => db.makeRef<Obj.Unknown>(URI.make(eid)).tryLoad());
        if (!target || Obj.isDeleted(target) || printing.has(target.id)) {
          return undefined;
        }

        const typename = Obj.getTypename(target);
        const print = capabilities
          .getAll(AppCapabilities.Exporter)
          .find((exporter) => exporter.id === typename && exporter.print)?.print;
        if (!print) {
          return undefined;
        }

        const html = yield* print(target);
        const { baseLabel } = parseEmbedLabel(label);
        const caption = baseLabel ? `<figcaption>${escapeHtml(baseLabel)}</figcaption>` : '';
        return `<figure class="embed">${caption}${html}</figure>`;
      }).pipe(
        // One unprintable embed should not cost the user the rest of the document.
        Effect.orElseSucceed(() => undefined),
      );

    const exporter: AppCapabilities.Exporter = {
      id: Type.getTypename(Markdown.Document),
      save: (document: Markdown.Document) =>
        loadContent(document).pipe(
          Effect.map((content) => ({
            extension: 'md',
            mimeType: 'text/markdown;charset=utf-8',
            content: removeEmbeds(content),
          })),
        ),
      print: (document: Markdown.Document) =>
        Effect.gen(function* () {
          printing.add(document.id);
          const content = yield* loadContent(document);

          const embedded = yield* Effect.forEach(findEmbeds(content), ({ label, eid }) =>
            renderEmbed(document, label, eid),
          );

          // Loaded on demand so the parser stays out of the startup bundle.
          const [{ micromark }, { gfm, gfmHtml }] = yield* Effect.tryPromise({
            try: () => Promise.all([import('micromark'), import('micromark-extension-gfm')]),
            catch: AppCapabilities.ExportError.wrap(),
          });
          // Raw HTML in the source stays escaped (micromark's default), so printing cannot run script.
          const placed = placeEmbeds(content, embedded);
          return placed.insert(micromark(placed.source, { extensions: [gfm()], htmlExtensions: [gfmHtml()] }));
        }).pipe(Effect.ensuring(Effect.sync(() => printing.delete(document.id)))),
    };

    return Capability.contribute(AppCapabilities.Exporter, exporter);
  }),
);
