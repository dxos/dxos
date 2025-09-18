//
// Copyright 2025 DXOS.org
//

import React from 'react';

import {
  PromptWidget,
  ReferenceWidget,
  SelectWidget,
  SuggestionWidget,
  SummaryWidget,
  ToggleContainer,
  type XmlWidgetProps,
  type XmlWidgetRegistry,
} from '@dxos/react-ui-components';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { ContentBlock, type DataType } from '@dxos/schema';

import { ToolBlock } from '../ToolBlock';

import { type BlockRenderer, type MessageThreadContext } from './sync';

const Fallback = ({ tag, ...props }: XmlWidgetProps<MessageThreadContext>) => {
  return (
    <ToggleContainer.Root classNames='rounded-sm'>
      <ToggleContainer.Header classNames='bg-groupSurface' title={tag} />
      <ToggleContainer.Content classNames='bg-modalSurface'>
        <Json classNames='!p-2 text-sm' data={props} />
      </ToggleContainer.Content>
    </ToggleContainer.Root>
  );
};

const getTextChild = (children: any[]): string | null => {
  const child = children?.[0];
  return typeof child === 'string' ? child : null;
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
    factory: (props) => {
      const text = getTextChild(props.children);
      return text ? new PromptWidget(text) : null;
    },
  },
  ['reference' as const]: {
    block: false,
    factory: (props) => {
      const text = getTextChild(props.children);
      return text && props.reference ? new ReferenceWidget(text, props.reference) : null;
    },
  },
  ['select' as const]: {
    block: true,
    factory: (props) => {
      const options = props.children
        ?.map((option: any) => option.tag === 'option' && getTextChild(option.children))
        .filter(Boolean);
      return options?.length ? new SelectWidget(options) : null;
    },
  },
  ['suggestion' as const]: {
    block: true,
    factory: (props) => {
      const text = getTextChild(props.children);
      return text ? new SuggestionWidget(text) : null;
    },
  },
  ['summary' as const]: {
    block: true,
    factory: (props) => {
      const text = getTextChild(props.children);
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
// TODO(burdon): Move into registry.
export const blockToMarkdown: BlockRenderer = (
  context: MessageThreadContext,
  message: DataType.Message,
  block: ContentBlock.Any,
) => {
  let str = _blockToMarkdown(context, message, block);
  if (str && !block.pending) {
    return (str += '\n');
  }

  return str;
};

const _blockToMarkdown = (context: MessageThreadContext, message: DataType.Message, block: ContentBlock.Any) => {
  switch (block._tag) {
    case 'text': {
      if (message.sender.role === 'user') {
        return `\n<prompt>${block.text}</prompt>\n`;
      } else {
        const text = block.text.trim();
        if (text.length > 0) {
          return text;
        }
      }
      break;
    }

    case 'suggestion': {
      return `<suggestion>${block.text}</suggestion>`;
    }
    case 'select': {
      return `<select>${block.options.map((option) => `<option>${option}</option>`).join('')}</select>`;
    }
    case 'toolkit': {
      return `<toolkit />`;
    }

    case 'toolCall': {
      context.updateWidget(block.toolCallId, {
        blocks: [block],
      });
      return `<toolCall id="${block.toolCallId}" />`;
    }
    case 'toolResult': {
      context.updateWidget(block.toolCallId, ({ blocks = [] }: { blocks: ContentBlock.Any[] }) => ({
        blocks: [...blocks, block],
      }));
      break;
    }

    case 'summary': {
      return `<summary>${ContentBlock.createSummaryMessage(block, true)}</summary>`;
    }

    default: {
      return `<json>\n${JSON.stringify(block)}\n</json>`;
    }
  }
};
