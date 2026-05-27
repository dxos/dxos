//
// Copyright 2026 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension, type Range, StateField } from '@codemirror/state';
import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import React from 'react';
import { createRoot } from 'react-dom/client';

import { Filter, Obj } from '@dxos/echo';
import { EchoURI } from '@dxos/keys';
import { type Space } from '@dxos/react-client/echo';
import { Status, ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui';
import { focusField } from '@dxos/ui-editor';
import { type MaybePromise } from '@dxos/util';

import { FileCapabilities, File } from '#types';

const WAIT_UNTIL_LOADER = 1500;

export type ImageOptions = {
  space: Space;
  resolvers: readonly FileCapabilities.UrlResolver[];
};

/**
 * Decorate `![](dxn:echo:...)` references that resolve to File objects with inline image previews.
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
  options: { space, resolvers },
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
      if (!EchoURI.isEchoURI(urlText)) {
        return;
      }

      let echoUri: string | undefined;
      let echoSpaceId: string | undefined;
      try {
        const parsed = EchoURI.parse(urlText);
        echoUri = EchoURI.getObjectId(parsed);
        echoSpaceId = EchoURI.getSpaceId(parsed);
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
      const blobUrlPromise = (async () => {
        const matched = await space.db.query(Filter.id(echoUri!)).first();
        if (!matched || !Obj.instanceOf(File.File, matched)) {
          return undefined;
        }

        let url: string | undefined;
        const { data } = matched;
        if (data._tag === 'inline') {
          url = URL.createObjectURL(new Blob([data.bytes as BlobPart], { type: matched.type }));
        } else if (/^(?:https?|data|blob):/i.test(data.url)) {
          url = data.url;
        } else {
          const resolver = resolvers.find((r) => r.test(data.url));
          url = await resolver?.resolve(data.url, matched, space);
        }
        if (!url) {
          return undefined;
        }
        blobUrlCache[cacheKey] = url;
        preload(url);
        return url;
      })();

      decorations.push(
        Decoration.replace({
          block: true,
          widget: new DxnImageWidget(urlText, blobUrlCache[cacheKey] ?? blobUrlPromise),
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
