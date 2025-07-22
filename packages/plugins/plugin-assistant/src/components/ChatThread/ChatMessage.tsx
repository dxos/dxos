//
// Copyright 2025 DXOS.org
//

import React, { type FC, type PropsWithChildren } from 'react';

import { type MessageContentBlock, type Message, type Tool } from '@dxos/ai';
import { Surface } from '@dxos/app-framework';
import { type Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { type Space } from '@dxos/react-client/echo';
import { Button, Icon, IconButton, type ThemedClassName } from '@dxos/react-ui';
import {
  MarkdownViewer,
  ToggleContainer as NativeToggleContainer,
  type ToggleContainerProps,
} from '@dxos/react-ui-components';
import { mx } from '@dxos/react-ui-theme';
import { safeParseJson } from '@dxos/util';

import { Json, ToolBlock, isToolMessage } from './ToolBlock';
import { type ChatProcessor } from '../../hooks';
import { ToolboxContainer } from '../Toolbox';

export type ChatMessageProps = ThemedClassName<{
  space?: Space;
  processor?: ChatProcessor;
  message: Message;
  debug?: boolean;
  tools?: Tool[];
  onPrompt?: (text: string) => void;
  onDelete?: (id: string) => void;
  onAddToGraph?: (object: Obj.Any) => void;
}>;

export const ChatMessage = ({
  classNames,
  space,
  processor,
  message,
  tools,
  onPrompt,
  onAddToGraph,
}: ChatMessageProps) => {
  const { role, content = [] } = message;

  // TODO(burdon): Restructure types to make check unnecessary.
  if (isToolMessage(message)) {
    return (
      <MessageContainer classNames={mx(classNames, 'animate-[fadeIn_0.5s]')}>
        <ToolBlock classNames={panelClassNames} message={message} tools={tools} />
      </MessageContainer>
    );
  }

  return content.map((block, idx) => {
    // TODO(burdon): Filter empty messages.
    if (block.type === 'text' && block.text.replaceAll(/\s+/g, '').length === 0) {
      return null;
    }

    const Component = components[block.type] ?? components.default;

    return (
      <MessageContainer
        key={idx}
        classNames={mx(classNames, 'animate-[fadeIn_0.5s]')}
        user={block.type === 'text' && role === 'user'}
      >
        <Component space={space} processor={processor} block={block} onPrompt={onPrompt} onAddToGraph={onAddToGraph} />
      </MessageContainer>
    );
  });
};

type BlockComponent = FC<{
  space?: Space;
  /** @deprecated Replace with context */
  processor?: ChatProcessor;
  block: MessageContentBlock;
  onPrompt?: (text: string) => void;
  onAddToGraph?: (object: Obj.Any) => void;
}>;

const components: Record<string, BlockComponent> = {
  //
  // Text
  //
  ['text' as const]: ({ block }) => {
    invariant(block.type === 'text');
    // const [open, setOpen] = useState(block.disposition === 'cot' && block.pending);
    const title = block.disposition ? titles[block.disposition] : undefined;
    if (!title) {
      return <MarkdownViewer classNames='[&>p]:animate-[fadeIn_0.5s]' content={block.text} />;
    }

    // TOOD(burdon): Store last time user opened/closed COT.
    // Autoclose when streaming ends.
    // useEffect(() => {
    //   if (block.disposition === 'cot' && !block.pending) {
    //     setOpen(false);
    //   }
    // }, [block.disposition, block.pending]);

    return (
      <ToggleContainer
        // open={open}
        defaultOpen={systemDispositions.includes(block.disposition ?? '') && block.pending}
        title={title}
        icon={
          block.pending ? (
            <Icon icon={'ph--circle-notch--regular'} classNames='text-subdued ml-2 animate-spin' size={4} />
          ) : undefined
        }
      >
        <MarkdownViewer
          content={block.text}
          classNames={['pbe-2', systemDispositions.includes(block.disposition ?? '') && 'text-sm text-subdued']}
        />
      </ToggleContainer>
    );
  },

  //
  // JSON
  //
  ['json' as const]: ({ space, processor, block, onPrompt, onAddToGraph }) => {
    invariant(block.type === 'json');

    switch (block.disposition) {
      case 'tool_list': {
        return (
          <ToggleContainer title={titles[block.disposition]} defaultOpen={true}>
            <ToolboxContainer space={space} processor={processor} classNames='pbe-2' />
          </ToggleContainer>
        );
      }

      case 'suggest': {
        const { text = '' }: { text: string } = safeParseJson(block.json ?? '{}') ?? ({} as any);
        return <IconButton icon='ph--lightning--regular' label={text} onClick={() => onPrompt?.(text)} />;
      }

      case 'select': {
        const { options = [] }: { options: string[] } = safeParseJson(block.json ?? '{}') ?? ({} as any);
        return (
          <div className='flex flex-wrap gap-1'>
            {options.map((option, idx) => (
              <Button
                classNames={'animate-[fadeIn_0.5s] rounded-sm text-sm'}
                key={option}
                onClick={() => onPrompt?.(option)}
              >
                {option}
              </Button>
            ))}
          </div>
        );
      }

      case 'graph': {
        return (
          <div className='flex flex-wrap gap-1'>
            <Surface
              role='card'
              data={{ subject: JSON.parse(block.json ?? '{}') }}
              limit={1}
              fallback={<div className='font-mono text-xs text-pre'>{block.json}</div>}
            />
            {onAddToGraph && (
              <IconButton
                icon='ph--plus--regular'
                label='Add to graph'
                onClick={() => onAddToGraph?.(JSON.parse(block.json ?? '{}'))}
              />
            )}
          </div>
        );
      }

      default: {
        const title = block.disposition ? titles[block.disposition] : undefined;
        return (
          <ToggleContainer title={title ?? 'JSON'}>
            <Json data={safeParseJson(block.json ?? block)} />
          </ToggleContainer>
        );
      }
    }
  },

  //
  // Default
  //
  default: ({ block }) => {
    let title = titles[block.type];
    if (block.type === 'tool_use') {
      title = `Tool [${block.name}]`; // TODO(burdon): Get label from tool.
    }

    return (
      <ToggleContainer title={title ?? 'JSON'}>
        <Json data={block} />
      </ToggleContainer>
    );
  },
};

// TODO(burdon): Translations.
const titles: Record<string, string> = {
  ['cot' as const]: 'Chain of thought',
  ['artifact' as const]: 'Artifact',
  ['tool_use' as const]: 'Tool request',
  ['tool_result' as const]: 'Tool result',
  ['tool_list' as const]: 'Tools',
  ['artifact-update' as const]: 'Artifact(s) changed',
};

const systemDispositions: string[] = ['cot', 'artifact-update'];

const panelClassNames = 'flex flex-col w-full px-2 bg-activeSurface rounded-sm';
const userClassNames = 'bg-[--user-fill] text-accentSurfaceText';

const ToggleContainer = (props: ToggleContainerProps) => {
  return <NativeToggleContainer {...props} classNames={mx(panelClassNames, props.classNames)} />;
};

const MessageContainer = ({ children, classNames, user }: ThemedClassName<PropsWithChildren<{ user?: boolean }>>) => {
  if (!children) {
    return null;
  }

  return (
    <div role='list-item' className={mx('flex w-full', user && 'justify-end', classNames)}>
      <div className={mx(user ? ['px-2 py-1 rounded-sm', userClassNames] : 'w-full')}>{children}</div>
    </div>
  );
};
