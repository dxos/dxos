//
// Copyright 2026 DXOS.org
//

import { useEffect, useRef } from 'react';

import { Obj } from '@dxos/echo';

import { type Model, type Scene } from '#types';

export type UseSelectedObjectColorOptions = {
  scene?: Scene.Scene;
  selectedObjectId: string | null;
  /** The colour picker's value. */
  hue: string;
  onHueChange: (hue: string) => void;
};

const findObject = (scene: Scene.Scene | undefined, id: string | null): Model.Object | undefined => {
  if (!id || !scene?.objects) {
    return undefined;
  }
  for (const ref of scene.objects) {
    const object = ref?.target;
    if (object && object.id === id) {
      return object;
    }
  }
  return undefined;
};

/**
 * Keeps the colour picker and the selected object's colour in step: selecting an object adopts its
 * colour, and changing the picker writes it to the object.
 *
 * No "programmatic change" flag: a flag armed on selection could only be disarmed by a hue change,
 * so selecting an object whose colour already matched the picker left it armed and swallowed the
 * next real change. Comparing against the object's colour needs no memory of who changed what.
 */
export const useSelectedObjectColor = ({
  scene,
  selectedObjectId,
  hue,
  onHueChange,
}: UseSelectedObjectColorOptions) => {
  // The write effect keys on the hue alone (a new selection must not stamp the picker's colour on an
  // uncoloured object), so it reads the rest through refs.
  const sceneRef = useRef(scene);
  sceneRef.current = scene;
  const selectedObjectIdRef = useRef(selectedObjectId);
  selectedObjectIdRef.current = selectedObjectId;
  const hueRef = useRef(hue);
  hueRef.current = hue;

  // Selection → picker.
  useEffect(() => {
    const object = findObject(scene, selectedObjectId);
    if (object?.color && object.color !== hueRef.current) {
      onHueChange(object.color);
    }
  }, [scene, selectedObjectId, onHueChange]);

  // Picker → object, on a change of the picker only (not on mount, which would stamp the picker's
  // colour on the selection before the selection had a chance to be adopted); a no-op when the
  // picker just adopted the object's colour.
  const lastHueRef = useRef(hue);
  useEffect(() => {
    if (lastHueRef.current === hue) {
      return;
    }
    lastHueRef.current = hue;
    const object = findObject(sceneRef.current, selectedObjectIdRef.current);
    if (object && object.color !== hue) {
      Obj.update(object, (object) => {
        object.color = hue;
      });
    }
  }, [hue]);
};
