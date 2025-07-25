//
// Copyright 2025 DXOS.org
//

import React, { type FC, type PropsWithChildren } from 'react';

import { type Tool } from '@dxos/ai';
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
import { type ContentBlock, type DataType } from '@dxos/schema';
import { safeParseJson } from '@dxos/util';

import { Json, ToolBlock, isToolMessage } from './ToolBlock';
import { type ChatProcessor } from '../../hooks';
import { ToolboxContainer } from '../Toolbox';

export type ChatMessageProps = ThemedClassName<{
  debug?: boolean;
  space?: Space;
  processor?: ChatProcessor;
  message: DataType.Message;
  tools?: Tool[];
  onPrompt?: (text: string) => void;
  onDelete?: (id: string) => void;
  onAddToGraph?: (object: Obj.Any) => void;
}>;

export const ChatMessage = ({
  debug,
  classNames,
  space,
  processor,
  message,
  tools,
  onPrompt,
  onAddToGraph,
}: ChatMessageProps) => {
  const {
    sender: { role },
    blocks,
  } = message;

  // TODO(burdon): Restructure types to make check unnecessary.
  if (isToolMessage(message)) {
    return (
      <MessageContainer classNames={mx(classNames, 'animate-[fadeIn_0.5s]')}>
        <ToolBlock classNames={panelClassNames} message={message} tools={tools} />
      </MessageContainer>
    );
  }

  return blocks.map((block, idx) => {
    // TODO(burdon): Filter empty messages.
    if (block._tag === 'text' && block.text.replaceAll(/\s+/g, '').length === 0) {
      return null;
    }

    const Component = components[block._tag] ?? components.default;
    if (!Component) {
      return null;
    }

    return (
      <MessageContainer
        key={idx}
        classNames={mx(classNames, '__animate-[fadeIn_0.5s]')}
        user={block._tag === 'text' && role === 'user'}
      >
        {debug && <div className='text-xs'>{JSON.stringify({ block: block._tag, role })}</div>}
        <Component space={space} processor={processor} block={block} onPrompt={onPrompt} onAddToGraph={onAddToGraph} />
      </MessageContainer>
    );
  });
};

type BlockComponent = FC<{
  space?: Space;
  /** @deprecated Replace with context */
  processor?: ChatProcessor;
  block: ContentBlock.Any;
  onPrompt?: (text: string) => void;
  onAddToGraph?: (object: Obj.Any) => void;
}>;

const components: Partial<Record<ContentBlock.Any['_tag'] | 'default', BlockComponent>> = {
  //
  // Text
  //
  ['text' as const]: ({ block }) => {
    invariant(block._tag === 'text');
    // const [open, setOpen] = useState(block.disposition === 'cot' && block.pending);
    const title = block.disposition ? titles[block.disposition] : undefined;
    if (!title) {
      return <MarkdownViewer content={block.text} />;
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
    invariant(block._tag === 'json');

    switch (block.disposition) {
      case 'tool_list': {
        return (
          <ToggleContainer title={titles[block.disposition]} defaultOpen={true}>
            <ToolboxContainer space={space} processor={processor} classNames='pbe-2' />
          </ToggleContainer>
        );
      }

      case 'suggest': {
        const { text = '' }: { text: string } = safeParseJson(block.data ?? '{}') ?? ({} as any);
        return <IconButton icon='ph--lightning--regular' label={text} onClick={() => onPrompt?.(text)} />;
      }

      case 'select': {
        const { options = [] }: { options: string[] } = safeParseJson(block.data ?? '{}') ?? ({} as any);
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
              data={{ subject: JSON.parse(block.data ?? '{}') }}
              limit={1}
              fallback={<div className='font-mono text-xs text-pre'>{block.data}</div>}
            />
            {onAddToGraph && (
              <IconButton
                icon='ph--plus--regular'
                label='Add to graph'
                onClick={() => onAddToGraph?.(JSON.parse(block.data ?? '{}'))}
              />
            )}
          </div>
        );
      }

      default: {
        const title = block.disposition ? titles[block.disposition] : undefined;
        return (
          <ToggleContainer title={title ?? 'JSON'}>
            <Json data={safeParseJson(block.data ?? block)} />
          </ToggleContainer>
        );
      }
    }
  },

  //
  // Default
  //
  default: ({ block }) => {
    let title = titles[block._tag];
    if (block._tag === 'toolCall') {
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
