//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { log } from '@dxos/log';
import {
  PromptWidget,
  ReferenceWidget,
  SelectWidget,
  SuggestionWidget,
  SummaryWidget,
  ToggleContainer,
} from '@dxos/react-ui-components';
import { type XmlWidgetProps, type XmlWidgetRegistry, getXmlTextChild } from '@dxos/react-ui-editor';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { ContentBlock, type Message } from '@dxos/types';

import { ToolBlock } from '../ToolBlock';

import { type BlockRenderer, type MessageThreadContext } from './sync';

const Fallback = ({ _tag, ...props }: XmlWidgetProps<MessageThreadContext>) => {
  return (
    <ToggleContainer.Root classNames='rounded-sm'>
      <ToggleContainer.Header classNames='bg-groupSurface'>{_tag}</ToggleContainer.Header>
      <ToggleContainer.Content classNames='bg-modalSurface'>
        <Json classNames='!p-2 text-sm' data={props} />
      </ToggleContainer.Content>
    </ToggleContainer.Root>
  );
};

/**
 * Custom XML tags registry.
 */
export const componentRegistry: XmlWidgetRegistry = {
  //
  // Widgets
  //

  ['prompt' as const]: {
    block: true,
    factory: ({ children }) => {
      const text = getXmlTextChild(children);
      return text ? new PromptWidget(text) : null;
    },
  },
  ['reference' as const]: {
    block: false,
    factory: ({ children, ref }) => {
      const text = getXmlTextChild(children);
      return text && ref ? new ReferenceWidget(text, ref) : null;
    },
  },
  ['select' as const]: {
    block: true,
    factory: ({ children }) => {
      const options = children
        ?.map((option: any) => option._tag === 'option' && getXmlTextChild(option.children))
        .filter(Boolean);
      return options?.length ? new SelectWidget(options) : null;
    },
  },
  ['suggestion' as const]: {
    block: true,
    factory: ({ children }) => {
      const text = getXmlTextChild(children);
      return text ? new SuggestionWidget(text) : null;
    },
  },
  ['summary' as const]: {
    block: true,
    factory: ({ children }) => {
      const text = getXmlTextChild(children);
      return text ? new SummaryWidget(text) : null;
    },
  },

  //
  // React
  //

  ['toolCall' as const]: {
    block: true,
    Component: ToolBlock,
  },
  ['toolResult' as const]: {
    block: true,
    Component: Fallback,
  },
  ['toolkit' as const]: {
    block: true,
    Component: Fallback,
  },

  //
  // Fallback
  //

  ['json' as const]: {
    block: true,
    Component: Fallback,
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
      context.updateWidget<{ blocks: ContentBlock.Any[] }>(block.toolCallId, ({ blocks = [] }) => ({
        blocks: [...blocks, block],
      }));
      break;
    }
    case 'summary': {
      return `<summary>${ContentBlock.createSummaryMessage(block)}</summary>`;
    }
    default: {
      // TODO(burdon): Needs stable ID.
      return `<json id="${message.id}">\n${JSON.stringify(block)}\n</json>`;
    }
  }
};
