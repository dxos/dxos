//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { Decoration } from '@codemirror/view';

import { type WidgetDef, type WidgetMatcher, createWidget, widgetMatchersFacet, widgetsCore } from '@dxos/ui-editor';

import { blockCommands } from './block-commands.ts';
import { type SpecBlocksConfig, blockListeners, specBlocksConfig, specBlocksField } from './spec-blocks-state.ts';
import { SpecBlockCard, type SpecBlockCardProps } from './SpecBlockCard.tsx';

const CARD: WidgetDef<SpecBlockCardProps> = { Component: SpecBlockCard, block: true, keepAlive: true };

/** Each fenced block of a kind the spec's schemas define, drawn as its card; other fences stay text. */
const matcher: WidgetMatcher = {
  nodes: ['FencedCode'],
  match: (node, { state, notifier, counters }) => {
    if (!state.facet(specBlocksConfig).cards) {
      return undefined;
    }
    const { blocks, schemas } = state.field(specBlocksField);
    const block = blocks.find(({ fence, from }) => fence.from <= node.from && node.from < from);
    if (!block || !schemas.has(block.kind)) {
      return undefined;
    }
    // Keyed by the block, not its position, so a card keeps its editors' state while the text above it changes.
    const key = `${block.kind}:${block.id}`;
    const index = counters.get(key) ?? 0;
    counters.set(key, index + 1);
    const widget = createWidget<SpecBlockCardProps>({
      def: CARD,
      id: `spec-block:${key}:${index}`,
      props: {
        _tag: 'spec-block',
        range: { from: node.from, to: node.to },
        locator: { kind: block.kind, id: block.id, index },
      },
      notifier,
    });
    return widget && { from: node.from, to: node.to, decoration: Decoration.replace({ block: true, widget }) };
  },
};

/**
 * A spec's blocks typed by their kinds' schemas, which the spec's dialects and its own `ext` blocks define: a slash
 * command per kind, and with `cards` each block drawn as a form over its schema. The text stays the source: a form edits
 * the source of the field it changed and nothing else.
 */
export const specBlocks = (config: SpecBlocksConfig): Extension => [
  specBlocksConfig.of(config),
  specBlocksField,
  blockListeners,
  blockCommands,
  widgetsCore,
  widgetMatchersFacet.of(matcher),
];
