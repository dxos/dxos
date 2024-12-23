//
// Copyright 2024 DXOS.org
//

import { useHotkeys } from 'react-hotkeys-hook';

import { useEditorContext } from './useEditorContext';

/**
 * Handle keyboard shortcuts.
 */
export const useShortcuts = () => {
  const { id, graph, selection, actionHandler } = useEditorContext();

  useHotkeys(
    'meta+x',
    (ev) => {
      ev.preventDefault();
      void actionHandler?.({
        type: 'cut',
      });
    },
    { scopes: [id] },
  );
  useHotkeys(
    'meta+c',
    (ev) => {
      ev.preventDefault();
      void actionHandler?.({
        type: 'copy',
      });
    },
    { scopes: [id] },
  );
  useHotkeys(
    'meta+v',
    (ev) => {
      ev.preventDefault();
      void actionHandler?.({
        type: 'paste',
      });
    },
    { scopes: [id] },
  );

  useHotkeys(
    'Backspace',
    (ev) => {
      ev.preventDefault();
      void actionHandler?.({
        type: 'delete',
        ids: [...selection.selected.value],
      });
    },
    { scopes: [id] },
  );
  useHotkeys(
    'Escape',
    (ev) => {
      ev.preventDefault();
      void actionHandler?.({
        type: 'select',
        ids: [],
      });
    },
    { scopes: [id] },
  );

  useHotkeys(
    'd',
    (ev) => {
      ev.preventDefault();
      void actionHandler?.({
        type: 'debug',
      });
    },
    { scopes: [id] },
  );

  useHotkeys(
    'meta+a',
    (ev) => {
      ev.preventDefault();
      void actionHandler?.({
        type: 'select',
        ids: [...graph.nodes.map((node) => node.id), ...graph.edges.map((edge) => edge.id)],
      });
    },
    { scopes: [id] },
  );

  useHotkeys(
    "meta+'",
    (ev) => {
      ev.preventDefault();
      void actionHandler?.({
        type: 'grid',
      });
    },
    { scopes: [id] },
  );

  useHotkeys(
    'Home',
    (ev) => {
      ev.preventDefault();
      void actionHandler?.({
        type: 'home',
      });
    },
    { scopes: [id] },
  );
};
