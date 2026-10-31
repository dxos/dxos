//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Type } from '@dxos/echo';

import { Markdown } from '#types';

const loadContent = (document: Markdown.Document) =>
  Effect.tryPromise(() => document.content.load()).pipe(Effect.map((text) => text.content ?? ''));

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const exporter: AppCapabilities.Exporter = {
      id: Type.getTypename(Markdown.Document),
      save: (document: Markdown.Document) =>
        loadContent(document).pipe(
          Effect.map((content) => ({ extension: 'md', mimeType: 'text/markdown;charset=utf-8', content })),
        ),
      print: (document: Markdown.Document) =>
        Effect.gen(function* () {
          const content = yield* loadContent(document);
          // Loaded on demand so the parser stays out of the startup bundle.
          const [{ micromark }, { gfm, gfmHtml }] = yield* Effect.tryPromise(() =>
            Promise.all([import('micromark'), import('micromark-extension-gfm')]),
          );
          // Raw HTML in the source stays escaped (micromark's default), so printing cannot run script.
          return micromark(content, { extensions: [gfm()], htmlExtensions: [gfmHtml()] });
        }),
    };

    return Capability.contribute(AppCapabilities.Exporter, exporter);
  }),
);
