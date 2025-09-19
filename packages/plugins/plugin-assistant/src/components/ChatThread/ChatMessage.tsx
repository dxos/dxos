//
// Copyright 2025 DXOS.org
//

import { type AiTool } from '@effect/ai';
import React, { type FC, Fragment, type PropsWithChildren, useMemo } from 'react';

import { ErrorBoundary, Surface } from '@dxos/app-framework';
import { resolveRef } from '@dxos/client';
import { invariant } from '@dxos/invariant';
import { DXN, DXN_ECHO_REGEXP } from '@dxos/keys';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { Button, IconButton, Link, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { MarkdownViewer, ToggleContainer } from '@dxos/react-ui-components';
import {
  chatMessageJson,
  chatMessageMargin,
  chatMessagePadding,
  chatMessagePanel,
  chatMessagePanelContent,
  chatMessagePanelHeader,
} from '@dxos/react-ui-components';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';
import { ContentBlock, type DataType } from '@dxos/schema';
import { safeParseJson } from '@dxos/util';

import { meta } from '../../meta';
import { type ChatEvent } from '../Chat';
import { ToolBlock, isToolMessage } from '../ToolBlock';
import { Toolbox } from '../Toolbox';

import { ObjectLink } from './Link';

export type AiToolProvider = () => readonly AiTool.Any[];

export const styles = {
  margin: chatMessageMargin,
  padding: chatMessagePadding,
  panel: chatMessagePanel,
  panelHeader: chatMessagePanelHeader,
  panelContent: chatMessagePanelContent,
  json: chatMessageJson,
};

export type ChatMessageProps = ThemedClassName<{
  debug?: boolean;
  space?: Space;
  message: DataType.Message;
  toolProvider?: AiToolProvider;
  onEvent?: (event: ChatEvent) => void;
  onDelete?: () => void;
}>;

/**
 * @deprecated
 */
// TODO(burdon): Remove.
export const ChatMessage = ({
  classNames,
  debug,
  space,
  message,
  toolProvider,
  onEvent,
  onDelete,
}: ChatMessageProps) => {
  const { t } = useTranslation(meta.id);
  const {
    sender: { role },
    blocks,
  } = message;

  if (!debug && toolProvider && isToolMessage(message)) {
    return (
      <MessageItem classNames={[styles.margin, 'animate-[fadeIn_0.5s]']}>
        <ToolBlock blocks={message.blocks} />
      </MessageItem>
    );
  }

  return (
    <>
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
          <MessageItem key={idx} classNames={classNames} user={block._tag === 'text' && role === 'user'}>
            <ErrorBoundary data={block}>
              <Component space={space} block={block} debug={debug} onEvent={onEvent} />
            </ErrorBoundary>
          </MessageItem>
        );
      })}

      {onDelete && (
        <div className={mx('flex justify-end pbs-2 pbe-2 opacity-50 hover:opacity-100', styles.margin)}>
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
  debug?: boolean;
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
          a: ({ node: { properties } = {}, children, href, ...props }) => {
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

          img: ({ node: { properties } = {} }) => {
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

  ['reference' as const]: ({ block, space }) => {
    invariant(block._tag === 'reference');

    return <RefBlock block={block} space={space!} />;
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
        classNames='text-description'
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
      <ToggleContainer.Root classNames={styles.panel} defaultOpen>
        <ToggleContainer.Header classNames={styles.panelHeader}>{t('toolkit label')}</ToggleContainer.Header>
        <ToggleContainer.Content classNames={styles.panelContent}>
          <Toolbox />
        </ToggleContainer.Content>
      </ToggleContainer.Root>
    );
  },

  //
  // Summary
  //
  ['summary' as const]: ({ block, debug }) => {
    invariant(block._tag === 'summary');

    const summary = ContentBlock.createSummaryMessage(block, debug);
    return <div className='text-sm text-subdued'>{summary}</div>;
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
          <ToggleContainer.Root classNames={styles.panel}>
            <ToggleContainer.Header classNames={styles.panelHeader}>
              {block.disposition ?? block._tag}
            </ToggleContainer.Header>
            <ToggleContainer.Content classNames={styles.panelContent}>
              <Json data={safeParseJson(block.data ?? block)} classNames={styles.json} />
            </ToggleContainer.Content>
          </ToggleContainer.Root>
        );
      }
    }
  },

  //
  // Fallback
  //
  default: ({ block }) => {
    return (
      <ToggleContainer.Root classNames={styles.panel}>
        <ToggleContainer.Header classNames={styles.panelHeader}>{block._tag}</ToggleContainer.Header>
        <ToggleContainer.Content classNames={styles.panelContent}>
          <Json data={block} classNames={styles.json} />
        </ToggleContainer.Content>
      </ToggleContainer.Root>
    );
  },
};

const RefBlock = ({ block, space }: { block: ContentBlock.Reference; space: Space }) => {
  const ref = useMemo(() => space.db.ref(block.reference.dxn), [space, block.reference.dxn.toString()]);

  return <Surface role='card' data={{ subject: ref.target }} limit={1} />;
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
        <ToggleContainer.Root classNames={styles.panel}>
          <ToggleContainer.Header classNames={styles.panelHeader}>
            {error.message || t('error label')}
          </ToggleContainer.Header>
          <ToggleContainer.Content classNames={styles.panelContent}>{String(error.cause)}</ToggleContainer.Content>
        </ToggleContainer.Root>
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
    <div role='list-item' className={mx('flex is-full', user && 'justify-end', styles.margin, classNames)}>
      <div
        className={mx(user ? ['bg-[--user-fill] text-white dark:text-black rounded-sm', styles.padding] : 'is-full')}
      >
        {children}
      </div>
    </div>
  );
};

// TODO(burdon): Move to parser?
const preprocessTextContent = (content: string) =>
  content.replaceAll(new RegExp(DXN_ECHO_REGEXP, 'g'), (_, dxn) => `<${dxn}>`);
