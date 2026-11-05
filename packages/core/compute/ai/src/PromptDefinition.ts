//
// Copyright 2026 DXOS.org
//

import type * as Tool from 'effect/ai/Tool';
import type * as Toolkit from 'effect/ai/Toolkit';
import * as Context from 'effect/Context';
import * as Option from 'effect/Option';

import * as SchemaAST from '@dxos/effect/SchemaAST';

/**
 * A named section of the system prompt that tool parameters refer to.
 *
 * A format many tool fields share (e.g. how to write an object reference) is stated once here rather
 * than in every field's JSON Schema, which the model receives in full on every request.
 * The module that owns the format defines it; the request includes it only when a tool refers to it.
 */
export type PromptDefinition = {
  /** De-duplication key. */
  readonly id: string;
  /** Heading the model sees; field descriptions refer to the definition by this name. */
  readonly title: string;
  readonly text: string;
};

/**
 * Creates a definition.
 */
export const make = (definition: PromptDefinition): PromptDefinition => definition;

/**
 * Schema annotation key naming the definition that states a schema's format.
 */
export const AnnotationId = '@dxos/ai/PromptDefinition';

declare module 'effect/Schema' {
  namespace Annotations {
    interface Annotations {
      readonly '@dxos/ai/PromptDefinition'?: PromptDefinition;
    }
  }
}

/**
 * Annotations marking a schema as described by `definition`, to pass to `Schema.annotate`.
 */
export const annotations = (definition: PromptDefinition): { readonly [AnnotationId]: PromptDefinition } => ({
  [AnnotationId]: definition,
});

/**
 * The definition a schema node is annotated with.
 */
export const fromAst = (ast: SchemaAST.AST): PromptDefinition | undefined =>
  SchemaAST.resolveAnnotations(ast)?.[AnnotationId];

/**
 * Tool annotation listing the definitions the tool's parameters refer to.
 */
export class ToolAnnotation extends Context.Service<ToolAnnotation, readonly PromptDefinition[]>()(
  '@dxos/ai/PromptDefinition/ToolAnnotation',
) {}

/**
 * The definitions a tool's parameters refer to.
 */
export const fromTool = (tool: Tool.Any): readonly PromptDefinition[] =>
  Context.getOption(ToolAnnotation)(tool.annotations).pipe(Option.getOrElse((): readonly PromptDefinition[] => []));

/**
 * The definitions any tool in the toolkit refers to.
 */
export const fromToolkit = (toolkit: Toolkit.Any): PromptDefinition[] =>
  merge(...Object.values(toolkit.tools).map(fromTool));

/**
 * Concatenates definition lists, keeping the first definition for each id.
 */
export const merge = (...lists: readonly (readonly PromptDefinition[])[]): PromptDefinition[] => {
  const byId = new Map<string, PromptDefinition>();
  for (const definition of lists.flat()) {
    if (!byId.has(definition.id)) {
      byId.set(definition.id, definition);
    }
  }
  return [...byId.values()];
};

/**
 * Renders the definitions as a system prompt section, or `undefined` when there are none.
 */
export const format = (definitions: readonly PromptDefinition[]): string | undefined =>
  definitions.length === 0
    ? undefined
    : [
        '## Definitions',
        ...merge(definitions).map(({ title, text }) => `<definition name="${title}">\n${text}\n</definition>`),
      ].join('\n\n');
