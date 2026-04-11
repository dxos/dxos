//
// Copyright 2025 DXOS.org
//

import { log } from '@dxos/log';
import { ContentBlock, type Message } from '@dxos/types';
import { type XmlWidgetRegistry, getXmlTextChild } from '@dxos/ui-editor';

import { type BlockRenderer, type MessageThreadContext } from './sync';
import {
  FallbackWidget,
  PromptWidget,
  ReasoningWidget,
  ReferenceWidget,
  SelectWidget,
  SuggestionWidget,
  StatsWidget,
  SummaryWidget,
  ToolWidget,
  StatusWidget,
} from './widgets';

/**
 * Custom XML tags registry.
 */
export const componentRegistry: XmlWidgetRegistry = {
  //
  // DOM Widgets
  //

  prompt: {
    block: true,
    factory: ({ children }) => {
      const text = getXmlTextChild(children);
      return text ? new PromptWidget(text) : null;
    },
  },
  reasoning: {
    block: true,
    streaming: true,
    factory: ({ children, range }) => {
      const text = getXmlTextChild(children);
      return text ? new ReasoningWidget(text, range.from) : null;
    },
  },
  reference: {
    block: false,
    factory: ({ children, ref }) => {
      const text = getXmlTextChild(children);
      return text && ref ? new ReferenceWidget(text, ref) : null;
    },
  },
  select: {
    block: true,
    factory: ({ children }) => {
      const options = children
        ?.map((option: any) => option._tag === 'option' && getXmlTextChild(option.children))
        .filter(Boolean);
      return options?.length ? new SelectWidget(options) : null;
    },
  },
  suggestion: {
    block: true,
    factory: ({ children }) => {
      const text = getXmlTextChild(children);
      return text ? new SuggestionWidget(text) : null;
    },
  },
  stats: {
    block: true,
    factory: ({ children }) => {
      const text = getXmlTextChild(children);
      return text ? new StatsWidget(text) : null;
    },
  },
  status: {
    block: true,
    streaming: true,
    factory: ({ children, range }) => {
      const text = getXmlTextChild(children);
      return text ? new StatusWidget(text, range.from) : null;
    },
  },

  //
  // React Widgets (portaled outside of the editor)
  //

  summary: {
    block: true,
    Component: SummaryWidget,
  },
  toolCall: {
    block: true,
    Component: ToolWidget,
  },

  toolResult: {
    block: true,
    Component: FallbackWidget,
  },
  toolkit: {
    block: true,
    Component: FallbackWidget,
  },

  //
  // Fallback
  //

  json: {
    block: true,
    Component: FallbackWidget,
  },
};

/**
 * Convert block to markdown.
 */
export const blockToMarkdown: BlockRenderer = (
  context: MessageThreadContext,
  message: Message.Message,
  block: ContentBlock.Any,
) => {
  let str = blockToMarkdownImpl(context, message, block);
  if (str && !block.pending) {
    return (str += '\n');
  }

  return str;
};

const blockToMarkdownImpl = (context: MessageThreadContext, message: Message.Message, block: ContentBlock.Any) => {
  log('blockToMarkdown', { block: JSON.stringify(block) });
  switch (block._tag) {
    case 'text': {
      if (message.sender.role === 'user') {
        return `<prompt>${block.text}</prompt>`;
      } else {
        const text = block.text.trim();
        if (text.length > 0) {
          return text;
        }
      }
      break;
    }

    case 'reference': {
      if (block.pending) {
        return;
      }
      const dxn = block.reference.dxn;
      return `<reference ref="${dxn.toString()}">${context.getObjectLabel(dxn)}</reference>`;
    }

    case 'suggestion': {
      if (block.pending) {
        return;
      }
      return `<suggestion>${block.text}</suggestion>`;
    }

    case 'select': {
      if (block.pending || block.options.length === 0) {
        return;
      }
      return `<select>${block.options.map((option) => `<option>${option}</option>`).join('')}</select>`;
    }

    case 'toolCall': {
      context.updateWidget<{ blocks: ContentBlock.Any[] }>(block.toolCallId, {
        blocks: [block],
      });
      return `<toolCall id="${block.toolCallId}" />`;
    }

    case 'toolResult': {
      // TODO(dmaretskyi): the parameter could be undefined, perhaps tool blocks are not arriving in order.
      context.updateWidget<{ blocks: ContentBlock.Any[] }>(block.toolCallId, ({ blocks = [] } = { blocks: [] }) => ({
        blocks: [...blocks, block],
      }));
      break;
    }

    case 'stats': {
      return renderXMLBlock('stats', { content: ContentBlock.createStatsMessage(block) });
    }

    case 'reasoning': {
      let text = block.reasoningText ?? block.redactedText;
      if (!text) {
        return;
      }
      return renderXMLBlock('reasoning', { content: text, pending: block.pending });
    }

    case 'summary': {
      return renderXMLBlock('summary', { content: block.content, pending: block.pending });
    }

    case 'status': {
      return renderXMLBlock('status', { content: block.statusText, pending: block.pending });
    }

    default: {
      // TODO(burdon): Needs stable ID.
      return `<json id="${message.id}">\n${JSON.stringify(block)}\n</json>`;
    }
  }
};

const renderXMLBlock = (tag: string, opts: { content?: string; pending?: boolean; attributes?: string }) => {
  // Replace paragraph breaks so that markdown parser does not split the content into multiple paragraphs.
  const content = (opts.content ?? '').replace(/\n\n/g, ' ').trim();

  if (opts.pending) {
    return `<${tag}${opts.attributes ? ` ${opts.attributes}` : ''}>${content}`;
  } else {
    return `<${tag}${opts.attributes ? ` ${opts.attributes}` : ''}>${content}</${tag}>`;
  }
};
