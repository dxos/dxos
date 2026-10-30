//
// Copyright 2026 DXOS.org
//

import { useCallback, useState } from 'react';

import { type LayoutIntent, type ModelIntent, type Scene, applyIntent, applyModelIntent } from '@dxos/scene';

/** The model {@link fromRenderLists2D} places a drawing's objects in. */
const MODEL = 'model';

/** Applies `intent` to layout `key`, making an empty 2D layout when the intent creates it. */
const applyLayout = (document: Scene.SceneDocument, key: string, intent: LayoutIntent): Scene.SceneDocument => {
  const existing = document.layouts.find((layout) => layout.id === key);
  const next = applyIntent(existing ?? { id: key, dim: '2d', model: MODEL, elements: {} }, intent);
  return next === existing
    ? document
    : {
        ...document,
        layouts: existing
          ? document.layouts.map((layout) => (layout.id === key ? next : layout))
          : [...document.layouts, next],
      };
};

/** A document held in React state, which takes the engine's intents as a host would: what a story's canvas edits. */
export const useDocumentHost = (initial: Scene.SceneDocument | (() => Scene.SceneDocument)) => {
  const [document, setDocument] = useState(initial);
  const onIntent = useCallback(
    (layout: string, intent: LayoutIntent) => setDocument((current) => applyLayout(current, layout, intent)),
    [],
  );
  const onModelIntent = useCallback((intent: ModelIntent): readonly string[] => {
    setDocument((current) => applyModelIntent(current, intent).doc);
    return [];
  }, []);
  return { document, setDocument, onIntent, onModelIntent };
};
