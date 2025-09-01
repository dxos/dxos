//
// Copyright 2025 DXOS.org
//

import React, { type FC, Fragment, type PropsWithChildren, useMemo } from 'react';

import { type Tool } from '@dxos/ai';
import { ErrorBoundary, Surface } from '@dxos/app-framework';
import { resolveRef } from '@dxos/client';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { DXN, DXN_ECHO_REGEXP } from '@dxos/keys';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { Button, IconButton, Link, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import {
  MarkdownViewer,
  ToggleContainer as NativeToggleContainer,
  type ToggleContainerProps,
} from '@dxos/react-ui-components';
import { mx } from '@dxos/react-ui-theme';
import { type ContentBlock, type DataType } from '@dxos/schema';
import { safeParseJson } from '@dxos/util';

import { meta } from '../../meta';
import { type ChatEvent } from '../Chat';
import { Toolbox } from '../Toolbox';

import { ObjectLink } from './Link';
import { Json, ToolBlock, isToolMessage } from './ToolBlock';

const panelClasses = 'flex flex-col is-full bg-activeSurface rounded-sm';
const marginClasses = 'pie-4 pis-4';
const paddingClasses = 'pis-2 pie-2 pbs-0.5 pbe-0.5';

export type ChatMessageProps = ThemedClassName<{
  debug?: boolean;
  space?: Space;
  message: DataType.Message;
  tools?: Tool[];
  onEvent?: (event: ChatEvent) => void;
  onDelete?: () => void;
}>;

export const ChatMessage = ({ classNames, debug, space, message, tools, onEvent, onDelete }: ChatMessageProps) => {
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
              <ErrorBoundary data={block}>
                <Component space={space} block={block} onEvent={onEvent} />
              </ErrorBoundary>
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
  ['text' as const]: ({ space, block }) => {
    invariant(block._tag === 'text');
    return (
      <MarkdownViewer
        content={preprocessTextContent(block.text)}
        components={{
          a: ({ node: { properties }, children, href, ...props }) => {
            if (space && typeof properties?.href === 'string' && properties?.href?.startsWith('dxn')) {
              try {
                // TODO(burdon): Check valid length (since serialized).
                const dxn = DXN.parse(properties.href);
                return <ObjectLink space={space} dxn={dxn} />;
              } catch {}
            }

            // TODO(burdon): Can we revert to the default handler?
            return (
              <Link href={href} target='_blank' rel='noopener noreferrer' {...props}>
                {children}
              </Link>
            );
          },
          img: ({ node: { properties } }) => {
            const client = useClient();
            if (space && typeof properties?.src === 'string' && properties?.src?.startsWith('dxn')) {
              try {
                const dxn = DXN.parse(properties?.src);
                const subject = resolveRef(client, dxn, space);
                const data = useMemo(() => ({ subject }), [subject]);
                return <Surface role='card--transclusion' data={data} limit={1} />;
              } catch {}
            }
            return <img {...properties} />;
          },
        }}
      />
    );
  },

  //
  // Suggest
  //
  ['suggestion' as const]: ({ block, onEvent }) => {
    invariant(block._tag === 'suggestion');
    return (
      <IconButton
        icon='ph--lightning--regular'
        label={block.text}
        onClick={() => onEvent?.({ type: 'submit', text: block.text })}
      />
    );
  },

  //
  // Select
  //
  ['select' as const]: ({ block, onEvent }) => {
    invariant(block._tag === 'select');
    return (
      <div className='flex flex-wrap gap-1'>
        {block.options.map((option, idx) => (
          <Button
            classNames={'animate-[fadeIn_0.5s] rounded-sm text-sm'}
            key={idx}
            onClick={() => onEvent?.({ type: 'submit', text: option })}
          >
            {option}
          </Button>
        ))}
      </div>
    );
  },

  //
  // Toolkit
  //
  ['toolkit' as const]: ({ block }) => {
    invariant(block._tag === 'toolkit');
    const { t } = useTranslation(meta.id);

    return (
      <ToggleContainer title={t('toolkit label')} classNames={panelClasses} defaultOpen>
        <Toolbox classNames={marginClasses} />
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

export type ChatErrorProps = Pick<ChatMessageProps, 'onEvent'> & {
  error: Error;
};

/**
 * Error message with retry.
 */
export const ChatError = ({ error, onEvent }: ChatErrorProps) => {
  const { t } = useTranslation(meta.id);
  return (
    <>
      <MessageItem>
        <ToggleContainer title={error.message || t('error label')} classNames={[panelClasses, 'bg-warningSurface']}>
          <div className='p-2 text-small text-subdued'>{String(error.cause)}</div>
        </ToggleContainer>
      </MessageItem>
      <MessageItem>
        <IconButton
          classNames='bg-errorSurface text-errorSurfaceText'
          icon='ph--lightning--regular'
          label={t('button retry')}
          onClick={() => onEvent?.({ type: 'retry' })}
        />
      </MessageItem>
    </>
  );
};

/**
 * Wrapper for each message.
 */
const MessageItem = ({ classNames, children, user }: ThemedClassName<PropsWithChildren<{ user?: boolean }>>) => {
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

const ToggleContainer = ({ classNames, ...props }: ToggleContainerProps) => {
  return <NativeToggleContainer {...props} classNames={mx(panelClasses, classNames)} />;
};

export const renderObjectLink = (obj: Obj.Any, transclusion?: boolean) =>
  `${transclusion ? '!' : ''}[${Obj.getLabel(obj)}](${Obj.getDXN(obj).toString()})`;

// TODO(burdon): Move to parser.
const preprocessTextContent = (content: string) =>
  content.replaceAll(new RegExp(DXN_ECHO_REGEXP, 'g'), (_, dxn) => `<${dxn}>`);
