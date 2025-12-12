//
// Copyright 2025 DXOS.org
//

import { type SyntaxNode } from '@lezer/common';
import { parser } from '@lezer/markdown';
import { createMemo, For, Show } from 'solid-js';

import { log } from '@dxos/log';

import { theme } from '../theme';

export type MarkdownProps = {
  content?: string;
};

export const Markdown = (props: MarkdownProps) => {
  const tree = createMemo(() => {
    log('markdown', { content: props.content });
    return props.content ? parser.parse(props.content) : null;
  });

  return (
    <box flexDirection='column'>
      <Show when={tree()} fallback={<text>{props.content}</text>}>
        {(t) => <For each={[t()]}>{(currTree) => <RenderNode node={currTree.topNode} content={props.content!} />}</For>}
      </Show>
    </box>
  );
};

const RenderInline = (props: { node: SyntaxNode; content: string }) => {
  const items = () => {
    const result: ({ type: 'node'; node: SyntaxNode } | { type: 'text'; from: number; to: number })[] = [];
    let pos = props.node.from;
    let child = props.node.firstChild;
    while (child) {
      if (child.from > pos) {
        result.push({ type: 'text', from: pos, to: child.from });
      }
      result.push({ type: 'node', node: child });
      pos = child.to;
      if (child.name === 'HeaderMark') {
        const char = props.content[pos];
        if (char === ' ') {
          pos++;
        }
      }
      child = child.nextSibling;
    }

    if (pos < props.node.to) {
      result.push({ type: 'text', from: pos, to: props.node.to });
    }

    return result;
  };

  return (
    <>
      {items().map((item) => {
        if (item.type === 'node') {
          return <RenderNode node={item.node} content={props.content} />;
        }

        const text = props.content.slice(item.from, item.to);
        if (text === '\n') {
          return null;
        }

        return <>{text}</>;
      })}
    </>
  );
};

const RenderNode = (props: { node: SyntaxNode; content: string }) => {
  log('render', { type: props.node.name, content: props.content.length });

  const getChildren = () => {
    const nodes: SyntaxNode[] = [];
    let child = props.node.firstChild;
    while (child) {
      nodes.push(child);
      child = child.nextSibling;
    }
    return nodes;
  };

  const children = getChildren();

  switch (props.node.name) {
    case 'Document':
      return <For each={children}>{(child) => <RenderNode node={child} content={props.content} />}</For>;

    case 'Paragraph':
      return (
        <box marginBottom={props.node.parent?.name === 'ListItem' ? 0 : 1}>
          <text style={{ fg: theme.log.default }}>
            <RenderInline node={props.node} content={props.content} />
          </text>
        </box>
      );

    case 'ATXHeading1':
    case 'ATXHeading2':
    case 'ATXHeading3':
    case 'ATXHeading4':
    case 'ATXHeading5':
    case 'ATXHeading6':
      return (
        <box marginTop={1} marginBottom={1}>
          <text style={{ fg: theme.text.bold }}>
            <RenderInline node={props.node} content={props.content} />
          </text>
        </box>
      );

    case 'FencedCode':
      return (
        <box padding={1} flexDirection='column' style={{ backgroundColor: theme.input.bg }}>
          <For each={children}>{(child) => <RenderNode node={child} content={props.content} />}</For>
        </box>
      );

    case 'BulletList':
    case 'OrderedList':
      return (
        <box flexDirection='column' paddingLeft={1}>
          <For each={children}>{(child) => <RenderNode node={child} content={props.content} />}</For>
        </box>
      );

    case 'ListItem':
      return (
        <box flexDirection='row'>
          <For each={children}>{(child) => <RenderNode node={child} content={props.content} />}</For>
        </box>
      );

    case 'Blockquote':
      return (
        <box
          flexDirection='column'
          paddingLeft={1}
          borderStyle='single'
          style={{ borderLeft: true, borderColor: theme.text.subdued } as any}
        >
          <For each={children}>{(child) => <RenderNode node={child} content={props.content} />}</For>
        </box>
      );

    case 'CodeText':
      return <text style={{ fg: theme.log.info }}>{props.content.slice(props.node.from, props.node.to)}</text>;

    case 'CodeMark': // ```
    case 'CodeInfo': // language
    case 'HeaderMark': // #
    case 'QuoteMark': // >
    case 'EmphasisMark': // *
      return null;

    case 'ListMark': // - or 1.
      return <text style={{ fg: theme.accent }}>{props.content.slice(props.node.from, props.node.to)} </text>;

    case 'Emphasis':
    case 'StrongEmphasis':
      return (
        <span style={{ fg: theme.text.bold }}>
          <RenderInline node={props.node} content={props.content} />
        </span>
      );

    case 'InlineCode':
      return (
        <span style={{ fg: theme.log.info }}>
          <RenderInline node={props.node} content={props.content} />
        </span>
      );

    default:
      // Use RenderInline for unknown nodes to ensure text gaps are rendered.
      return <RenderInline node={props.node} content={props.content} />;
  }
};
