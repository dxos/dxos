//
// Copyright 2024 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension, type Range, StateField } from '@codemirror/state';
import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import type { Blockstore } from 'interface-blockstore';
import React from 'react';
import { createRoot } from 'react-dom/client';

import { type Space } from '@dxos/react-client/echo';
import { Status, ThemeProvider } from '@dxos/react-ui';
import { focusField } from '@dxos/react-ui-editor';
import { defaultTx } from '@dxos/react-ui-theme';
import { type MaybePromise } from '@dxos/util';

import { type WnfsCapabilities } from '../capabilities';
import { getBlobUrl, getPathFromUrl, loadWnfs } from '../helpers';

const WAIT_UNTIL_LOADER = 1500;

export type ImageOptions = {
  blockstore: Blockstore;
  instances: WnfsCapabilities.Instances;
  space: Space;
};

/**
 * Create WNFS image decorations.
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
      create: (state) => {
        return Decoration.set(
          buildDecorations({ from: 0, to: state.doc.length, state, blobUrlCache, preload, options }),
        );
      },
      update: (value, tr) => {
        if (!tr.docChanged && !tr.selection) {
          return value;
        }

        // Find range of changes and cursor changes.
        const cursor = tr.state.selection.main.head;
        const oldCursor = tr.changes.mapPos(tr.startState.selection.main.head);
        let from = Math.min(cursor, oldCursor);
        let to = Math.max(cursor, oldCursor);
        tr.changes.iterChangedRanges((fromA, toA, fromB, toB) => {
          from = Math.min(from, fromB);
          to = Math.max(to, toB);
        });

        // Expand to cover lines.
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
  options: { blockstore, instances, space },
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
      const wnfsUrl = state.sliceDoc(urlNode.from, urlNode.to);
      if (!wnfsUrl.startsWith('wnfs://')) {
        return;
      }

      const path = getPathFromUrl(wnfsUrl);

      // Cannot load images from other spaces
      const spaceId = path[1];
      if (spaceId !== space.id) {
        return;
      }

      // Load image contents into memory blob
      const blobUrlPromise = (async () => {
        const { directory, forest } = await loadWnfs({ blockstore, instances, space });
        const url = await getBlobUrl({ wnfsUrl, blockstore, directory, forest });
        blobUrlCache[path.join('/')] = url;
        preload(url);
        return url;
      })();

      decorations.push(
        Decoration.replace({
          block: true, // Prevent cursor from entering.
          widget: new WnfsImageWidget(wnfsUrl, blobUrlCache[path.join('/')] ?? blobUrlPromise),
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
  // If focused, hide image until successfully loaded to avoid flickering effects.
  if (view.state.field(focusField)) {
    img.onload = () => img.classList.add('cm-loaded-image');
  } else {
    img.classList.add('cm-loaded-image');
  }
  return img;
};

class WnfsImageWidget extends WidgetType {
  constructor(
    readonly _wnfsUrl: string,
    readonly _url: MaybePromise<string>,
  ) {
    super();
  }

  override eq(other: this) {
    return this._wnfsUrl === other._wnfsUrl;
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

    void this._url.then((url) => {
      clearTimeout(timeout);
      const img = createImg(view, url);
      loaderAdded && widget.removeChild(loader);
      widget.appendChild(img);
    });

    return widget;
  }
}
