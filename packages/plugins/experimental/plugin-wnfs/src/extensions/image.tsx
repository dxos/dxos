//
// Copyright 2024 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension, StateField, type Range, StateEffect } from '@codemirror/state';
import { Decoration, EditorView, WidgetType, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import type { Blockstore } from 'interface-blockstore';
import React from 'react';
import { createRoot } from 'react-dom/client';
import type { PrivateDirectory, PrivateForest } from 'wnfs';

import { log } from '@dxos/log';
import { type Space } from '@dxos/react-client/echo';
import { Status } from '@dxos/react-ui';

import { store } from '../common';
import { loadWnfs } from '../load';

export type ImageOptions = {
  blockstore: Blockstore;
  space: Space;
};

export const image = (options: ImageOptions): Extension[] => {
  return [stateField(options), viewPlugin(options)];
};

// GLOBAL STATE

/** Indexed by space id */
const loadedWnfsInstances: Record<string, { directory: PrivateDirectory; forest: PrivateForest }> = {};

// EFFECT + EXTENSIONS

const stateEffect = StateEffect.define<{
  decorations: Range<Decoration>[];
  from: number;
  to: number;
}>({});

const stateField = (options: ImageOptions) =>
  StateField.define({
    create: () => {
      return Decoration.none;
    },
    update: (value, tr) => {
      for (const effect of tr.effects) {
        if (effect.is(stateEffect)) {
          return value.map(tr.changes).update({
            filterFrom: effect.value.from,
            filterTo: effect.value.to,
            filter: () => false,
            add: effect.value.decorations,
          });
        }
      }

      return value;
    },
    provide: (f) => {
      return EditorView.decorations.from(f);
    },
  });

const viewPlugin = (options: ImageOptions) =>
  ViewPlugin.define((view: EditorView) => {
    // Initial decoration set on document load
    buildDecorations({
      from: 0,
      to: view.state.doc.length,
      state: view.state,
      options,
    })
      .then((decorations) => {
        view.dispatch({
          effects: stateEffect.of({
            decorations,
            from: 0,
            to: view.state.doc.length,
          }),
        });
      })
      .catch((err) => {
        throw new Error(err);
      });

    const update = (update: ViewUpdate) => {
      if (!update.docChanged) {
        return;
      }

      const { from, to } = changedRange(update);
      buildDecorations({
        from,
        to,
        state: view.state,
        options,
      })
        .then((decorations) => {
          view.dispatch({
            effects: stateEffect.of({
              decorations,
              from,
              to,
            }),
          });
        })
        .catch((err) => {
          log.catch(err);
        });
    };

    return { update };
  });

// 🛠️

const changedRange = (update: ViewUpdate) => {
  // Find range of changes and cursor changes.
  const cursor = update.state.selection.main.head;
  const oldCursor = update.changes.mapPos(update.startState.selection.main.head);

  let from = Math.min(cursor, oldCursor);
  let to = Math.max(cursor, oldCursor);

  update.changes.iterChangedRanges((fromA, toA, fromB, toB) => {
    from = Math.min(from, fromB);
    to = Math.max(to, toB);
  });

  // Expand to cover lines.
  from = update.state.doc.lineAt(from).from;
  to = update.state.doc.lineAt(to).to;

  // Fin
  return { from, to };
};

const buildDecorations = async ({
  from,
  to,
  state,
  options,
}: {
  from: number;
  to: number;
  state: EditorState;
  options: ImageOptions;
}) => {
  const cursor = state.selection.main.head;
  let nodes: { from: number; hide: boolean; to: number; url: string }[] = [];

  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name === 'Image') {
        const urlNode = node.node.getChild('URL');
        if (urlNode) {
          const hide = state.readOnly || cursor < node.from || cursor > node.to;
          const url = state.sliceDoc(urlNode.from, urlNode.to);

          if (url.startsWith('wnfs://')) {
            nodes.push({
              from: node.from,
              to: node.to,
              hide,
              url,
            });
          }
        }
      }
    },
    from,
    to,
  });

  // Nodes must be sorted by `from`
  nodes = nodes.sort((a, b) => {
    return a.from - b.from;
  });

  const decorations = await nodes.reduce(
    async (acc, node) => {
      const array = await acc;
      const path = node.url
        .replace(/^wnfs:\/\//, '')
        .split('/')
        .map((p) => decodeURIComponent(p));

      // Cannot load images from other spaces
      const spaceIdFromUrl = path[1];
      if (spaceIdFromUrl !== options.space.properties.id) {
        return array;
      }

      const cacheKey = options.space.properties.wnfs_private_forest_cid;

      const { directory, forest } = loadedWnfsInstances[cacheKey]
        ? loadedWnfsInstances[cacheKey]
        : await loadWnfs(options.space, options.blockstore);

      loadedWnfsInstances[cacheKey] = {
        directory,
        forest,
      };

      const wnfsStore = store(options.blockstore);

      // Load image contents into memory blob
      const { result } = await directory.read(path, true, forest, wnfsStore);
      const blob = new Blob([result]);
      const blobUrl = URL.createObjectURL(blob);

      // Create decoration
      return [
        ...array,
        Decoration.replace({
          block: true, // Prevent cursor from entering.
          widget: new WnfsImageWidget(blobUrl),
        }).range(node.hide ? node.from : node.to, node.to),
      ];
    },
    Promise.resolve([] as Range<Decoration>[]),
  );

  return decorations;
};

class WnfsImageWidget extends WidgetType {
  constructor(readonly _url: string) {
    super();
  }

  override eq(other: this) {
    return this._url === (other as any as WnfsImageWidget)._url;
  }

  override toDOM(view: EditorView) {
    const loader = document.createElement('div');
    const root = createRoot(loader);

    const img = document.createElement('img');
    img.setAttribute('loading', 'lazy');
    img.setAttribute('src', this._url);
    img.setAttribute('class', 'cm-image-with-loader');
    img.onload = () => {
      setTimeout(() => {
        img.classList.add('cm-loaded-image');
        img.closest('.cm-image-wrapper')?.classList?.add('cm-loaded-image');
        loader.parentNode?.removeChild(loader);
      }, 0);
    };

    const imageWrapper = document.createElement('div');
    imageWrapper.setAttribute('class', 'cm-image-wrapper');
    imageWrapper.appendChild(loader);
    imageWrapper.appendChild(img);

    // TODO:
    // root.render(<Status indeterminate={true} />);

    return imageWrapper;
  }
}
