//
// Copyright 2025 DXOS.org
//

import { type SyntaxNode } from '@lezer/common';
import { parser } from '@lezer/markdown';
import { ErrorBoundary, For, Show, createMemo } from 'solid-js';

import { log } from '@dxos/log';

import { theme } from '../theme';

export type MarkdownProps = {
  content?: string;
};

export const Markdown = (props: MarkdownProps) => {
  const tree = createMemo(() => {
    return props.content ? parser.parse(props.content) : null;
  });

  return (
    <ErrorBoundary
      fallback={(err) => {
        // NOTE: Must log full content here since it would be stale if logged above.
        log.info('markdown', { content: props.content, length: props.content?.length });
        log.catch(err);

        return (
          <box paddingLeft={1} paddingRight={1} borderStyle='single' style={{ borderColor: theme.log.error }}>
            <text style={{ fg: theme.text.default }}>{props.content}</text>
          </box>
        );
      }}
    >
      <box flexDirection='column'>
        <Show when={tree()} fallback={<text>{props.content}</text>}>
          {(t) => (
            <For each={[t()]}>{(currTree) => <RenderNode node={currTree.topNode} content={props.content!} />}</For>
          )}
        </Show>
      </box>
    </ErrorBoundary>
  );
};

const getChildren = (node: SyntaxNode) => {
  const nodes: SyntaxNode[] = [];
  let child = node.firstChild;
  while (child) {
    nodes.push(child);
    child = child.nextSibling;
  }
  return nodes;
};

const RenderNode = (props: { node: SyntaxNode; content: string }) => {
  log('render', { type: props.node.name, content: props.content.length });

  const children = getChildren(props.node);

  // Skip.
  if (props.node.name.startsWith('SetextHeading')) {
    return null;
  }

  switch (props.node.name) {
    case 'Document':
      return <For each={children}>{(child) => <RenderNode node={child} content={props.content} />}</For>;

    case 'Paragraph':
      return (
        <box marginLeft={1} marginRight={1} marginBottom={props.node.parent?.name === 'ListItem' ? 0 : 1}>
          <text style={{ fg: theme.text.default }}>
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
        <box marginLeft={1} marginRight={1}>
          <text style={{ fg: theme.text.bold }}>
            <RenderInline node={props.node} content={props.content} />
          </text>
        </box>
      );

    case 'FencedCode':
      return (
        <box
          marginTop={1}
          marginBottom={1}
          padding={1}
          flexDirection='column'
          style={{ backgroundColor: theme.input.bg }}
        >
          <For each={children}>{(child) => <RenderNode node={child} content={props.content} />}</For>
        </box>
      );

    case 'CodeText':
      return <text style={{ fg: theme.log.info }}>{props.content.slice(props.node.from, props.node.to)}</text>;

    case 'InlineCode':
      return (
        <span style={{ fg: theme.log.info }}>
          <RenderInline node={props.node} content={props.content} />
        </span>
      );

    case 'BulletList':
    case 'OrderedList':
      return (
        <box flexDirection='column' marginLeft={1} marginRight={1} marginBottom={1}>
          <For each={children}>{(child) => <RenderNode node={child} content={props.content} />}</For>
        </box>
      );

    case 'ListItem': {
      const children = getChildren(props.node);
      const mark = children.find((node) => node.name === 'ListMark');
      const contentNodes = children.filter((node) => node.name !== 'ListMark');

      return (
        <box flexDirection='row'>
          {mark && <RenderNode node={mark} content={props.content} />}
          <box flexDirection='column'>
            <For each={contentNodes}>{(child) => <RenderNode node={child} content={props.content} />}</For>
          </box>
        </box>
      );
    }

    case 'ListMark': // - or 1.
      return <text style={{ fg: theme.text.primary }}>{props.content.slice(props.node.from, props.node.to)}</text>;

    case 'Blockquote':
      return (
        <box flexDirection='column' paddingLeft={1} borderStyle='single' style={{ borderColor: theme.text.subdued }}>
          <For each={children}>{(child) => <RenderNode node={child} content={props.content} />}</For>
        </box>
      );

    case 'Emphasis':
    case 'StrongEmphasis':
      return (
        <span style={{ fg: theme.text.primary }}>
          <RenderInline node={props.node} content={props.content} />
        </span>
      );

    case 'CodeMark': // ```
    case 'CodeInfo': // language
    case 'HeaderMark': // #
    case 'QuoteMark': // >
    case 'EmphasisMark': // *
    case 'HorizontalRule': // ---
      return null;

    // Use RenderInline for unknown nodes to ensure text gaps are rendered.
    default:
      log.warn('unknown node', { type: props.node.name });
      return (
        <text marginLeft={1} marginRight={1}>
          <RenderInline node={props.node} content={props.content} />
        </text>
      );
  }
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

      switch (child.name) {
        case 'HeaderMark': {
          const char = props.content[pos];
          if (char === ' ') {
            pos++;
          }
          break;
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
        return <>{text}</>;
      })}
    </>
  );
};

// TODO(burdon): Create unit test.
export const TEST_MARKDOWN = [
  '# Example',
  '',
  'Hello! I am an AI assistant.',
  '',
  'You can ask me anything!',
  '',
  'Suggested actions:',
  '- Ask a question',
  '- Request artifact creation',
  '',
  '1. Outline',
  '    - item 1',
  '    - item 2',
  '2. Details',
  '    - item 3',
  '',
  "Here's **hello world** in `Typescript`",
  '',
  '```typescript',
  "console.log('Hello world!')",
  '```',
  '',
  'The End',
].join('\n');
