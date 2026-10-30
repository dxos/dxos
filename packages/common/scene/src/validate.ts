//
// Copyright 2026 DXOS.org
//

import { findLayout, findModel } from './document.ts';
import { type Dimension, RESERVED_IDS, type SceneDocument, kindsOf } from './Scene.ts';

/** Which part of a document a problem is in. */
export type Part = 'scene' | 'layout' | 'model';

/** Something wrong with a scene document, located by part and id and, when it is one element's or object's fault, it. */
export type Problem = { part: Part; id: string; element?: string; message: string };

const duplicates = (part: Part, ids: readonly string[]): Problem[] =>
  ids
    .filter((id, index) => ids.indexOf(id) !== index)
    .map((id) => ({ part, id, message: `Duplicate ${part} id "${id}".` }));

/**
 * Problems with ids, kinds, references between scenes, layouts and models, bindings and group members, in document
 * order: scenes, then layouts, then models.
 */
export const validateDocument = (doc: SceneDocument): Problem[] => {
  const problems: Problem[] = [
    ...duplicates(
      'scene',
      doc.scenes.map((scene) => scene.id),
    ),
    ...duplicates(
      'layout',
      doc.layouts.map((layout) => layout.id),
    ),
    ...duplicates(
      'model',
      doc.models.map((model) => model.id),
    ),
  ];

  /** Whether `id` names a layout of dimension `dim`, reporting why not under `report`. */
  const checkLayout = (id: string, dim: Dimension, report: (message: string) => void) => {
    const layout = findLayout(doc, id);
    if (!layout) {
      report(`Layout "${id}" is not in the document.`);
    } else if (layout.dim !== dim) {
      report(`Layout "${id}" is ${layout.dim}, not ${dim}.`);
    }
  };

  for (const scene of doc.scenes) {
    checkLayout(scene.layout, scene.dim, (message) => problems.push({ part: 'scene', id: scene.id, message }));
  }

  for (const layout of doc.layouts) {
    const report = (element: string | undefined, message: string) =>
      problems.push({ part: 'layout', id: layout.id, ...(element === undefined ? {} : { element }), message });
    const model = layout.model === undefined ? undefined : findModel(doc, layout.model);
    if (layout.model !== undefined && !model) {
      report(undefined, `Model "${layout.model}" is not in the document.`);
    } else if (model && model.dim !== layout.dim) {
      report(undefined, `Model "${model.id}" is ${model.dim}, not ${layout.dim}.`);
    }
    const ids = new Set(Object.keys(layout.elements));
    const kinds = kindsOf(layout.dim);
    for (const [key, element] of Object.entries(layout.elements)) {
      if (key !== element.id) {
        report(element.id, `Duplicate element id "${element.id}".`);
        continue;
      }
      if (RESERVED_IDS.includes(element.id)) {
        report(element.id, `The id "${element.id}" is reserved for the camera.`);
      }
      if (element.object !== undefined) {
        if (!model?.objects[element.object]) {
          report(element.id, `Object "${element.object}" is not in the layout's model.`);
        }
      } else if (element.type === undefined) {
        report(element.id, 'An element needs a kind or an object.');
      } else if (!kinds.includes(element.type)) {
        report(element.id, `A ${layout.dim} layout cannot hold a "${element.type}".`);
      }
      for (const end of [element.source, element.target]) {
        if (end?.node !== undefined && !ids.has(end.node)) {
          report(element.id, `Bound to "${end.node}", which is not in the layout.`);
        }
      }
      const missing = element.members?.filter((member: string) => !ids.has(member)) ?? [];
      if (missing.length > 0) {
        report(element.id, `Members not in the layout: ${missing.join(', ')}.`);
      }
    }
  }

  for (const model of doc.models) {
    const kinds = kindsOf(model.dim);
    for (const [key, object] of Object.entries(model.objects)) {
      const report = (message: string) => problems.push({ part: 'model', id: model.id, element: object.id, message });
      if (key !== object.id) {
        report(`Duplicate object id "${object.id}".`);
        continue;
      }
      // An element names an object where it would name a kind, so the two must not share a word.
      if (kinds.includes(object.id)) {
        report(`The object id "${object.id}" is also a kind.`);
      }
      if (!kinds.includes(object.type)) {
        report(`A ${model.dim} model cannot hold a "${object.type}".`);
      }
      if (object.parts !== undefined) {
        checkLayout(object.parts, model.dim, report);
      }
    }
  }
  return problems;
};
