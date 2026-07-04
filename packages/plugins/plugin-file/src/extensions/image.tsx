//
// Copyright 2026 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension, type Range, StateField } from '@codemirror/state';
import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import React from 'react';
import { createRoot } from 'react-dom/client';

import { Blob, Database, Filter, Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { EID } from '@dxos/keys';
import { type Space } from '@dxos/react-client/echo';
import { Status, ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui';
import { focusField } from '@dxos/ui-editor';
import { type MaybePromise } from '@dxos/util';

import { File } from '#types';

const WAIT_UNTIL_LOADER = 1500;

export type ImageOptions = {
  space: Space;
};

/**
 * Decorate `![](echo:...)` references that resolve to File objects with inline image previews.
 */
export const image = (options: ImageOptions): Extension[] => {
  const blobUrlCache: Record<string, string> = {};
  const preloaded = new Set<string>();

  const preload = (url: string) => {
    if (!preloaded.has(url)) {
      const img = document.createElement('img');
      img.src = url;
      preloaded.add(url);
    }
  };

  return [
    StateField.define({
      create: (state) =>
        Decoration.set(buildDecorations({ from: 0, to: state.doc.length, state, blobUrlCache, preload, options })),
      update: (value, tr) => {
        if (!tr.docChanged && !tr.selection) {
          return value;
        }

        const cursor = tr.state.selection.main.head;
        const oldCursor = tr.changes.mapPos(tr.startState.selection.main.head);
        let from = Math.min(cursor, oldCursor);
        let to = Math.max(cursor, oldCursor);
        tr.changes.iterChangedRanges((_fromA, _toA, fromB, toB) => {
          from = Math.min(from, fromB);
          to = Math.max(to, toB);
        });

        from = tr.state.doc.lineAt(from).from;
        to = tr.state.doc.lineAt(to).to;

        return value.map(tr.changes).update({
          filterFrom: from,
          filterTo: to,
          filter: () => false,
          add: buildDecorations({ from, to, state: tr.state, blobUrlCache, preload, options }),
        });
      },
      provide: (field) => EditorView.decorations.from(field),
    }),
  ];
};

const buildDecorations = ({
  state,
  from,
  to,
  blobUrlCache,
  preload,
  options: { space },
}: {
  state: EditorState;
  from: number;
  to: number;
  blobUrlCache: Record<string, string>;
  preload: (url: string) => void;
  options: ImageOptions;
}) => {
  const decorations: Range<Decoration>[] = [];
  const cursor = state.selection.main.head;
  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name !== 'Image') {
        return;
      }

      const urlNode = node.node.getChild('URL');
      if (!urlNode) {
        return;
      }

      const hide = state.readOnly || cursor < node.from || cursor > node.to;
      const urlText = state.sliceDoc(urlNode.from, urlNode.to);
      if (!EID.isEID(urlText)) {
        return;
      }

      let echoUri: string | undefined;
      let echoSpaceId: string | undefined;
      try {
        const parsed = EID.parse(urlText);
        echoUri = EID.getEntityId(parsed);
        echoSpaceId = EID.getSpaceId(parsed);
      } catch {
        return;
      }
      if (!echoUri) {
        return;
      }

      // Skip references to objects in other spaces.
      if (echoSpaceId && echoSpaceId !== space.id) {
        return;
      }

      const cacheKey = urlText;
      const cached = blobUrlCache[cacheKey];
      // Skip the DB query and Blob resolution entirely once a URL is cached — otherwise every
      // decoration rebuild (e.g. on cursor movement) re-fetches and, on the object-URL fallback
      // path, mints and leaks a new `blob:` URL even though the cached one is still valid.
      const blobUrlPromise =
        cached ??
        (async () => {
          const matched = await space.db.query(Filter.id(echoUri!)).first();
          if (!matched || !Obj.instanceOf(File.File, matched)) {
            return undefined;
          }

          const url = await EffectEx.runPromise(
            Effect.gen(function* () {
              const blob = yield* Database.load(matched.data);
              const urlOption = yield* Blob.url(blob);
              if (Option.isSome(urlOption)) {
                return urlOption.value;
              }
              const bytes = yield* Blob.read(blob);
              // `Uint8Array` is generic over `ArrayBufferLike` (incl. `SharedArrayBuffer`) while
              // DOM's `BlobPart` only covers `ArrayBuffer`-backed views — a gap between the DOM lib
              // types and the TS standard lib, not fixable by typing `bytes` differently.
              return URL.createObjectURL(new globalThis.Blob([bytes as BlobPart], { type: matched.type }));
            }).pipe(
              Effect.provide(Database.layer(space.db)),
              Effect.catchAll(() => Effect.succeed(undefined)),
            ),
          );
          if (!url) {
            return undefined;
          }
          // Only object URLs we minted via `createObjectURL` above need revoking — `Blob.url()`
          // results (data:/https: URLs) aren't owned by this cache.
          const previous = blobUrlCache[cacheKey];
          if (previous?.startsWith('blob:')) {
            URL.revokeObjectURL(previous);
          }
          blobUrlCache[cacheKey] = url;
          preload(url);
          return url;
        })();

      decorations.push(
        Decoration.replace({
          block: true,
          widget: new DxnImageWidget(urlText, blobUrlPromise),
        }).range(hide ? node.from : node.to, node.to),
      );
    },
    from,
    to,
  });

  return decorations;
};

const createImg = (view: EditorView, url: string) => {
  const img = document.createElement('img');
  img.setAttribute('src', url);
  img.setAttribute('class', 'cm-image-with-loader');
  if (view.state.field(focusField)) {
    img.onload = () => img.classList.add('cm-loaded-image');
  } else {
    img.classList.add('cm-loaded-image');
  }
  return img;
};

class DxnImageWidget extends WidgetType {
  constructor(
    readonly _dxnUrl: string,
    readonly _url: MaybePromise<string | undefined>,
  ) {
    super();
  }

  override eq(other: this) {
    return this._dxnUrl === other._dxnUrl;
  }

  override toDOM(view: EditorView) {
    if (typeof this._url === 'string') {
      return createImg(view, this._url);
    }

    const widget = document.createElement('div');
    widget.className = 'cm-image-wrapper';
    const loader = document.createElement('div');
    loader.className = 'mx-auto transition-opacity';
    let loaderAdded = false;

    const timeout = setTimeout(() => {
      const root = createRoot(loader);
      root.render(
        <ThemeProvider tx={defaultTx}>
          <Status indeterminate />
        </ThemeProvider>,
      );
      widget.appendChild(loader);
      loaderAdded = true;
    }, WAIT_UNTIL_LOADER);

    void Promise.resolve(this._url)
      .then((url) => {
        clearTimeout(timeout);
        if (loaderAdded) {
          widget.removeChild(loader);
        }
        if (url) {
          widget.appendChild(createImg(view, url));
        }
      })
      .catch(() => {
        clearTimeout(timeout);
        if (loaderAdded) {
          widget.removeChild(loader);
        }
      });

    return widget;
  }
}
