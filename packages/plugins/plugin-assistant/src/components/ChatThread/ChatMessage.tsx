//
// Copyright 2025 DXOS.org
//

import React, { type FC, Fragment, type PropsWithChildren, useMemo, useSyncExternalStore } from 'react';

import { type Tool } from '@dxos/ai';
import { Surface } from '@dxos/app-framework';
import { Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import type { DXN } from '@dxos/keys';
import { type Space, useSpace } from '@dxos/react-client/echo';
import { Button, IconButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import {
  MarkdownViewer,
  ToggleContainer as NativeToggleContainer,
  type ToggleContainerProps,
} from '@dxos/react-ui-components';
import { mx } from '@dxos/react-ui-theme';
import { type ContentBlock, type DataType } from '@dxos/schema';
import { safeParseJson } from '@dxos/util';

import { type AiChatProcessor } from '../../hooks';
import { meta } from '../../meta';
import { type ChatEvent } from '../Chat';
import { Toolbox } from '../Toolbox';

import { Json, ToolBlock, isToolMessage } from './ToolBlock';

const panelClasses = 'flex flex-col is-full bg-activeSurface rounded-sm';
const marginClasses = 'pie-4 pis-4';
const paddingClasses = 'pis-2 pie-2 pbs-0.5 pbe-0.5';

export type ChatMessageProps = ThemedClassName<{
  debug?: boolean;
  space?: Space;
  message: DataType.Message;
  // TODO(burdon): Move to context.
  processor?: AiChatProcessor;
  tools?: Tool[];
  onEvent?: (event: ChatEvent) => void;
  onDelete?: () => void;
}>;

export const ChatMessage = ({
  classNames,
  debug,
  space,
  message,
  processor,
  tools,
  onEvent,
  onDelete,
}: ChatMessageProps) => {
  const { t } = useTranslation(meta.id);
  const {
    sender: { role },
    blocks,
  } = message;

  // TODO(burdon): Consolidate tools upstream?
  if (isToolMessage(message)) {
    return (
      <MessageItem classNames={mx(classNames, 'animate-[fadeIn_0.5s]')}>
        <ToolBlock classNames={panelClasses} message={message} tools={tools} />
      </MessageItem>
    );
  }

  return (
    <>
      {debug && (
        <div className={mx('flex justify-end text-subdued', marginClasses)}>
          <pre className='text-xs'>{JSON.stringify({ created: message.created })}</pre>
        </div>
      )}

      {blocks.map((block, idx) => {
        // TODO(burdon): Filter empty messages.
        if (block._tag === 'text' && block.text.replaceAll(/\s+/g, '').length === 0) {
          return null;
        }

        const Component: ContentBlockComponent = components[block._tag] ?? components.default!;
        if (!Component) {
          return null;
        }

        return (
          <Fragment key={idx}>
            <MessageItem classNames={classNames} user={block._tag === 'text' && role === 'user'}>
              <Component space={space} processor={processor} block={block} onEvent={onEvent} />
            </MessageItem>
            {debug && (
              <div className={mx('flex justify-end text-subdued', marginClasses)}>
                <pre className='text-xs'>{JSON.stringify({ block: block._tag })}</pre>
              </div>
            )}
          </Fragment>
        );
      })}

      {onDelete && (
        <div className={mx('flex justify-end pbs-2 pbe-2 opacity-50 hover:opacity-100', marginClasses)}>
          <IconButton
            classNames='animate-[fadeIn_0.5s]'
            icon='ph--trash--regular'
            iconOnly
            label={t('button delete message')}
            onClick={() => onDelete()}
          />
        </div>
      )}
    </>
  );
};

type ContentBlockProps = {
  space?: Space;
  block: ContentBlock.Any;
  /** @deprecated Replace with context */
  processor?: AiChatProcessor;
  onEvent?: (event: ChatEvent) => void;
};

type ContentBlockComponent = FC<ContentBlockProps>;

/**
 * Components for rendering content blocks.
 */
const components: Partial<Record<ContentBlock.Any['_tag'] | 'default', ContentBlockComponent>> = {
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
  ['json' as const]: ({ block, onEvent }) => {
    invariant(block._tag === 'json');

    // TODO(burdon): Disposition is deprecated.
    switch (block.disposition) {
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
        return (
          <ToggleContainer title={block.disposition ?? block._tag}>
            <Json data={safeParseJson(block.data ?? block)} />
          </ToggleContainer>
        );
      }
    }
  },

  //
  // Fallback
  //
  default: ({ block }) => {
    return (
      <ToggleContainer title={block._tag}>
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

const preprocessTextContent = (content: string) => {
  return content.replaceAll(/@(dxn:[a-zA-Z0-p:@]+)/g, (_, dxn) => `<${dxn}>`);
};
