//
// Copyright 2026 DXOS.org
//

import { type Element, RESERVED_IDS, type SceneDocument, type SceneRecord, kindsOf } from './Scene.ts';

/** Something wrong with a scene document, located by scene and, when it is one element's fault, the element. */
export type Problem = { scene: string; element?: string; message: string };

const elementsOf = (scene: SceneRecord): readonly [string, Element][] => Object.entries(scene.elements);

/** Problems with ids, kinds, bindings, group members and child scenes, in document order. */
export const validateDocument = (doc: SceneDocument): Problem[] => {
  const sceneIds = new Set(doc.scenes.map((scene) => scene.id));
  return doc.scenes.flatMap((scene) => {
    const problems: Problem[] = [];
    const report = (element: string, message: string) => problems.push({ scene: scene.id, element, message });
    const ids = new Set(Object.keys(scene.elements));
    const kinds = kindsOf(scene.dim);
    for (const [key, element] of elementsOf(scene)) {
      if (key !== element.id) {
        report(element.id, `Duplicate element id "${element.id}".`);
        continue;
      }
      if (RESERVED_IDS.includes(element.id)) {
        report(element.id, `The id "${element.id}" is reserved for the camera.`);
      }
      if (!kinds.includes(element.kind)) {
        report(element.id, `A ${scene.dim} scene cannot hold a "${element.kind}".`);
      }
      for (const binding of [element.from, element.to]) {
        if (binding && !ids.has(binding.element)) {
          report(element.id, `Bound to "${binding.element}", which is not in the scene.`);
        }
      }
      const missing = element.members?.filter((member) => !ids.has(member)) ?? [];
      if (missing.length > 0) {
        report(element.id, `Members not in the scene: ${missing.join(', ')}.`);
      }
      if (element.scene !== undefined && !sceneIds.has(element.scene)) {
        report(element.id, `Child scene "${element.scene}" is not in the document.`);
      }
    }
    return problems;
  });
};
