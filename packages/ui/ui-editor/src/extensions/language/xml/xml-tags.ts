//
// Copyright 2025 DXOS.org
//

// XML tags as widgets: a `<tag>` element in the markdown is matched by name against a registry and
// replaced by the widget its definition names. The widget machinery — the decoration field, the
// portal lifecycle, state and context effects, bookmark navigation — is `widgets`; this module is
// the element matcher, including the tail scan that hides a streaming tag before its close arrives.

import { type EditorState, type Extension } from '@codemirror/state';
import { Decoration, type WidgetType } from '@codemirror/view';

import { type Range } from '../../../types';
import { escapeRegExpSource } from '../../../util';
import {
  type WidgetDef,
  type WidgetMatch,
  type WidgetMatcher,
  type WidgetNotifier,
  type WidgetProps,
  createWidget,
  widgetId,
  widgetMatchersFacet,
  widgetsCore,
} from '../../widgets';
import { nodeToJson } from './xml-util';

/**
 * Widget registry definition: how one tag renders.
 * Prefer an `id="..."` attribute on the tag so `updateWidget` can target the instance; if omitted,
 * an id is derived from the tag’s document range (non-streaming) or opening position (streaming).
 * Streaming tags use `cm-xml-<from>` so the same portal id is kept when the closing tag arrives.
 */
export type XmlWidgetDef = WidgetDef<WidgetProps> & {
  /**
   * When true, the opening tag is flushed immediately and inner content streams character-by-character.
   */
  streaming?: boolean;
};

/** Tag name → definition. */
export type XmlWidgetRegistry = Record<string, XmlWidgetDef>;

/**
 * The FIRST child, and only when it is a string.
 *
 * Enough for a tag whose content is one run of text; a tag holding a nested element gets everything
 * from that element onwards dropped, because the parser splits contents into alternating text and
 * element children. Use {@link getXmlInnerText} where nesting is possible.
 */
export const getXmlTextChild = (children: any[]): string | null => {
  const child = children?.[0];
  return typeof child === 'string' ? child : null;
};

/**
 * All text inside a tag, nested elements contributing their text but not their markup.
 *
 * A model writes prose that happens to fence a block in tags of its own — a reminder quoting a
 * `<checklist>`, say — and the reader wants the prose whole. Their tag NAMES are dropped rather
 * than reserialised: they delimit the block for the model, and are noise on screen.
 */
export const getXmlInnerText = (children: any[]): string | null => {
  const text = (children ?? [])
    .map((child) => (typeof child === 'string' ? child : (getXmlInnerText(child?.children ?? []) ?? '')))
    .join('');
  return text.length > 0 ? text : null;
};

export type XmlTagsOptions = {
  /** Tag registry. */
  registry?: XmlWidgetRegistry;
};

/**
 * Implements custom XML tags via CodeMirror-native Widgets and portaled React/Solid components.
 *
 * - Decorations are created from XML tags that matched the provided registry.
 * - Native widgets are rendered inline; React/Solid widgets are portaled through the host's
 *   `widgetHost({ setWidgets })`.
 * - Widget state can be updated via `widgetUpdateEffect`, possibly BEFORE the widget is mounted.
 */
export const xmlTags = ({ registry = {} }: XmlTagsOptions = {}): Extension => [
  widgetsCore,
  widgetMatchersFacet.of(createXmlMatcher(registry)),
];

const createXmlMatcher = (registry: XmlWidgetRegistry): WidgetMatcher => {
  // Longest names first so `react-widget` wins over `react` in alternation.
  const streamingTagNames = Object.entries(registry)
    .filter(([, def]) => def.streaming)
    .map(([name]) => name)
    .sort((a, b) => b.length - a.length);

  return {
    nodes: ['Element'],
    debug: Object.values(registry).some((def) => def.debug),
    match: (node, { state, context, widgetStateMap, notifier }) => {
      const args = nodeToJson(state, node.node);
      if (!args) {
        return undefined;
      }
      const def = registry[args._tag];
      if (!def) {
        return undefined;
      }
      // Skip unclosed streaming elements — the unclosed tag scan handles them.
      if (def.streaming && !node.node.getChild('CloseTag')) {
        return undefined;
      }

      const range = { from: node.node.from, to: node.node.to };
      const id = widgetId(args.id, def.streaming ? `cm-xml-${range.from}` : `cm-xml-${range.from}-${range.to}`);
      // NOTE: The widget state may already have been updated before the widget is mounted.
      const props = { id, range, context, ...args, ...widgetStateMap[id] } satisfies WidgetProps;
      const widget = createWidget({
        def,
        id,
        props,
        notifier,
        signature: state.sliceDoc(range.from, range.to),
      });
      if (!widget) {
        return undefined;
      }
      return {
        ...range,
        decoration: Decoration.replace({ widget, block: def.block, atomic: true, inclusive: true, tag: args._tag }),
      };
    },
    tail: ({ state, range, context, widgetStateMap, notifier }) =>
      streamingTagNames.length > 0
        ? matchStreamingTail(state, range, registry, streamingTagNames, { context, widgetStateMap, notifier })
        : undefined,
  };
};

/**
 * Scans the document tail for an unclosed streaming tag and decorates it provisionally, so its
 * markup never renders raw while the rest of it arrives.
 */
const matchStreamingTail = (
  state: EditorState,
  range: Range,
  registry: XmlWidgetRegistry,
  streamingTagNames: string[],
  {
    context,
    widgetStateMap,
    notifier,
  }: { context: any; widgetStateMap: Record<string, any>; notifier: WidgetNotifier },
): WidgetMatch | undefined => {
  const tailText = state.sliceDoc(range.from, range.to);
  const streamingPattern = streamingTagNames.map(escapeRegExpSource).join('|');
  const tagPattern = new RegExp(`<(${streamingPattern})(\\s[^>]*)?>`, 'g');
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(tailText)) !== null) {
    const tagName = match[1];
    const closeTag = `</${tagName}>`;
    const afterOpen = match.index + match[0].length;

    // Only process if there's no closing tag after this opening tag.
    if (tailText.indexOf(closeTag, afterOpen) !== -1) {
      continue;
    }

    const absoluteFrom = range.from + match.index;
    const contentFrom = range.from + afterOpen;
    const innerText = state.sliceDoc(contentFrom, range.to).trim();

    const def = registry[tagName];
    const props: WidgetProps = {
      _tag: tagName,
      context,
      range: { from: absoluteFrom, to: range.to },
      children: innerText ? [innerText] : undefined,
    };

    // Parse attributes from the opening tag.
    const attrPattern = /(\w+)="([^"]*)"/g;
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = attrPattern.exec(match[0])) !== null) {
      props[attrMatch[1]] = attrMatch[2];
    }

    const id = widgetId(props.id, `cm-xml-${absoluteFrom}`);
    const mergedProps = { ...props, id, ...widgetStateMap[id] };
    const widget: WidgetType | undefined = createWidget({ def, id, props: mergedProps, notifier, streaming: true });

    // Decorated even when the factory declined: a factory may return null while the tag is still
    // empty (`<reasoning>` with no text yet), and leaving the range undecorated renders the raw
    // markup to the reader for exactly as long as that lasts — the flash this scan exists to
    // prevent. Without a widget it is an inline replace that simply hides the text; `block` needs
    // a widget to size the line, so it is only claimed when there is one.
    return {
      from: absoluteFrom,
      to: range.to,
      streamingFrom: absoluteFrom,
      decoration: Decoration.replace({
        ...(widget ? { widget, block: def.block } : {}),
        atomic: true,
        inclusive: true,
        tag: tagName,
        streaming: true,
        contentFrom,
      }),
    };
  }

  // A chunk boundary can land inside the opening tag itself, leaving a tail like `<reasoni` that
  // the complete-tag scan above cannot match — and an undecorated tail renders as literal markup
  // until the `>` arrives. Hidden without a widget: there is no tag name yet to build one from,
  // and `block` needs a widget to size the line.
  const partial = matchPartialOpenTag(tailText, streamingTagNames);
  if (partial !== undefined) {
    const absoluteFrom = range.from + partial.from;
    return {
      from: absoluteFrom,
      to: range.to,
      streamingFrom: absoluteFrom,
      decoration: Decoration.replace({
        atomic: true,
        inclusive: true,
        streaming: true,
        contentFrom: range.to,
        // The fragment, not the tag it may become: `tag` is what bookmark navigation matches
        // against, and a tag that has not arrived yet must not be a jump target.
        tag: partial.fragment,
      }),
    };
  }

  return undefined;
};

/**
 * Offset of a trailing `<` that could still become one of `tagNames`, or undefined.
 *
 * Only the document tail is considered: an unterminated `<` anywhere earlier is prose (`5 < 6`),
 * since a real tag would have been closed by the text that follows it. Requiring the fragment to be
 * a prefix of a registered name is what keeps `a < b` and `<div` out.
 */
const matchPartialOpenTag = (text: string, tagNames: string[]): { from: number; fragment: string } | undefined => {
  const start = text.lastIndexOf('<');
  if (start === -1) {
    return undefined;
  }

  const fragment = text.slice(start + 1);
  // A `>` means the tag is complete (or is not a tag at all); either way the scan above owns it.
  if (fragment.includes('>')) {
    return undefined;
  }

  // `<` alone is ambiguous — it becomes a tag or stays prose on the next character, and hiding the
  // tail on that guess flickers the reader's own text.
  return fragment.length > 0 && tagNames.some((name) => name.startsWith(fragment))
    ? { from: start, fragment }
    : undefined;
};
