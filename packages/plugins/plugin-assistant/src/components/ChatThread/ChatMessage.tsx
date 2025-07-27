//
// Copyright 2025 DXOS.org
//

import React, { Fragment, type FC, type PropsWithChildren } from 'react';

import { type Tool } from '@dxos/ai';
import { Surface } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { type Space } from '@dxos/react-client/echo';
import { Button, Icon, IconButton, useTranslation, type ThemedClassName } from '@dxos/react-ui';
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
import { meta } from '../../meta';
import { type ChatEvent } from '../Chat';
import { ToolboxContainer } from '../Toolbox';

export type ChatMessageProps = ThemedClassName<{
  debug?: boolean;
  space?: Space;
  message: DataType.Message;
  // TODO(burdon): Move to context.
  processor?: ChatProcessor;
  tools?: Tool[];
  onEvent?: (event: ChatEvent) => void;
}>;

export const ChatMessage = ({ classNames, debug, space, message, processor, tools, onEvent }: ChatMessageProps) => {
  const { t } = useTranslation(meta.id);
  const {
    sender: { role },
    blocks,
  } = message;

  // TODO(burdon): Restructure types to make check unnecessary.
  if (isToolMessage(message)) {
    return (
      <MessageContainer classNames={mx(classNames, 'animate-[fadeIn_0.5s]')}>
        <ToolBlock classNames={panelClasses} message={message} tools={tools} />
      </MessageContainer>
    );
  }

  return (
    <>
      {debug && (
        <div className='flex justify-end text-subdued'>
          <pre className='text-xs'>{JSON.stringify({ created: message.created })}</pre>
        </div>
      )}

      {blocks.map((block, idx) => {
        // TODO(burdon): Filter empty messages.
        if (block._tag === 'text' && block.text.replaceAll(/\s+/g, '').length === 0) {
          return null;
        }

        const Component: BlockComponent = components[block._tag] ?? components.default!;
        if (!Component) {
          return null;
        }

        return (
          <Fragment key={idx}>
            <MessageContainer classNames={classNames} user={block._tag === 'text' && role === 'user'}>
              <Component space={space} processor={processor} block={block} onEvent={onEvent} />
            </MessageContainer>
            {debug && (
              <div className='flex justify-end text-subdued'>
                <pre className='text-xs'>{JSON.stringify({ block: block._tag })}</pre>
              </div>
            )}
          </Fragment>
        );
      })}
      <div className={mx('flex justify-end pbs-2 pbe-2 opacity-50 hover:opacity-100', marginClasses)}>
        <IconButton
          classNames='animate-[fadeIn_0.5s]'
          icon='ph--trash--regular'
          iconOnly
          label={t('button delete message')}
          onClick={() => onEvent?.({ type: 'delete', id: message.id })}
        />
      </div>
    </>
  );
};

type BlockComponentProps = {
  space?: Space;
  block: ContentBlock.Any;
  /** @deprecated Replace with context */
  processor?: ChatProcessor;
  onEvent?: (event: ChatEvent) => void;
};

type BlockComponent = FC<BlockComponentProps>;

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
            <Icon icon={'ph--circle-notch--regular'} classNames='text-subdued animate-spin' size={4} />
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
  ['json' as const]: ({ space, processor, block, onEvent }) => {
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
        return (
          <IconButton icon='ph--lightning--regular' label={text} onClick={() => onEvent?.({ type: 'submit', text })} />
        );
      }

      case 'select': {
        const { options = [] }: { options: string[] } = safeParseJson(block.data ?? '{}') ?? ({} as any);
        return (
          <div className='flex flex-wrap gap-1'>
            {options.map((text, idx) => (
              <Button
                classNames={'animate-[fadeIn_0.5s] rounded-sm text-sm'}
                key={idx}
                onClick={() => onEvent?.({ type: 'submit', text })}
              >
                {text}
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
            {onEvent && (
              <IconButton
                icon='ph--plus--regular'
                label='Add to graph'
                onClick={() => onEvent?.({ type: 'add', object: JSON.parse(block.data ?? '{}') })}
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

const panelClasses = 'flex flex-col is-full bg-activeSurface rounded-sm';
const marginClasses = 'pie-4 pis-4';
const paddingClasses = 'pis-2 pie-2 pbs-1 pbe-1';

const MessageContainer = ({ classNames, children, user }: ThemedClassName<PropsWithChildren<{ user?: boolean }>>) => {
  if (!children) {
    return null;
  }

  return (
    <div role='list-item' className={mx('flex is-full', user && 'justify-end', marginClasses, classNames)}>
      <div className={mx(user ? ['rounded-sm', 'bg-[--user-fill] text-accentSurfaceText', paddingClasses] : 'is-full')}>
        {children}
      </div>
    </div>
  );
};

const ToggleContainer = (props: ToggleContainerProps) => {
  return <NativeToggleContainer {...props} classNames={mx(panelClasses, props.classNames)} />;
};
