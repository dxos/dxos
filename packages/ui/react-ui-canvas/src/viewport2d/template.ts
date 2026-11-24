//
// Copyright 2026 DXOS.org
//

//
// Compiling a tool's composite template: the DSL source a node definition carries into the composite its instances
// draw. A template is written, not coded — `composite card { element … constrain=stretch,max }` — so a plugin
// contributes a shape by describing it, and the same text is what the editor would print back from the Object.
//

import { DSL } from '@dxos/diagram';
import { type NodeKind, type Scene, type ViewId } from '@dxos/scene';

import { type NodeRegistry, type RenderList2D, templateCompositeId, templateType } from '../model/index.ts';
import { toRenderLists2D } from './render-list.ts';

/** What a template compiled to, or why it did not. */
export type CompiledTemplate = { composite: RenderList2D } | { problems: readonly string[] };

export const isCompiled = (result: CompiledTemplate): result is { composite: RenderList2D } => 'composite' in result;

/**
 * The composite a template's DSL source declares, under `id`. The source names its composite whatever reads best
 * (`composite card { … }`); the id it is stored under is the tool's, so every instance of that tool finds it.
 */
export const compileTemplate = (source: string, id: ViewId): CompiledTemplate => {
  const { document, problems } = DSL.readScenes(source);
  if (problems.length > 0) {
    return { problems: problems.map((problem) => problem.message) };
  }
  const parts = document.layouts.find(
    (layout): layout is Scene.LayoutRecord2D => layout.dim === '2d' && layout.kind === 'composite',
  );
  if (!parts) {
    return { problems: ['A template declares one composite.'] };
  }
  const { lists } = toRenderLists2D(document, {
    id: 'template',
    dim: '2d',
    layout: parts.id,
    camera: { center: { x: 0, y: 0 }, zoom: 1 },
  });
  const list = lists.find((candidate) => candidate.id === parts.id);
  return list ? { composite: { ...list, id, kind: 'composite' } } : { problems: ['The composite has no parts.'] };
};

/**
 * The composite a tool's instances draw, compiled from the kind's template; none when the kind has no template or its
 * source does not compile. The caller stores it under `composite`, so the next instance of the tool reuses it.
 */
export const templateComposite = (registry: NodeRegistry, composite: ViewId): RenderList2D | undefined => {
  const kind = templateType(composite);
  const source = kind === undefined ? undefined : templateSource(registry, kind);
  if (source === undefined) {
    return undefined;
  }
  const result = compileTemplate(source, composite);
  return isCompiled(result) ? result.composite : undefined;
};

/** A kind's template source, when it has one. */
export const templateSource = (registry: NodeRegistry, kind: NodeKind): string | undefined => registry[kind]?.template;

/** The composite a node of `kind` would be an instance of, when the kind is a template tool. */
export const templateIdOf = (registry: NodeRegistry, kind: NodeKind): ViewId | undefined =>
  templateSource(registry, kind) === undefined ? undefined : templateCompositeId(kind);
