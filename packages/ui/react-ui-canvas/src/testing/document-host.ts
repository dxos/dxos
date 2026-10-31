//
// Copyright 2026 DXOS.org
//

import { useCallback, useState } from 'react';

import {
  type LayoutIntent,
  type ModelIntent,
  type Scene,
  applyIntent,
  applyModelIntent,
  findLayout,
} from '@dxos/scene';

import { type ConstrainIntent } from '../model/index.ts';

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

export type DocumentHostOptions = {
  /** The layouts' mode, applied to every write with snapping on, as an editor would. */
  constrain?: ConstrainIntent;
};

/** A document held in React state, which takes the engine's intents as a host would: what a story's canvas edits. */
export const useDocumentHost = (
  initial: Scene.SceneDocument | (() => Scene.SceneDocument),
  { constrain }: DocumentHostOptions = {},
) => {
  const [document, setDocument] = useState(initial);
  const onIntent = useCallback(
    (layout: string, intent: LayoutIntent) =>
      setDocument((current) => {
        const record = constrain && findLayout(current, layout);
        const constrained = record && constrain ? constrain(record, intent, { snap: true }) : intent;
        return constrained ? applyLayout(current, layout, constrained) : current;
      }),
    [constrain],
  );
  const onModelIntent = useCallback((intent: ModelIntent): readonly string[] => {
    setDocument((current) => applyModelIntent(current, intent).doc);
    return [];
  }, []);
  return { document, setDocument, onIntent, onModelIntent };
};
