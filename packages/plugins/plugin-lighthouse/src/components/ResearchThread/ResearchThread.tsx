//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEvent, useCallback, useState } from 'react';

import { ChatThread, type ChatThreadEvent } from '@dxos/react-ui-assistant';
import { useFeedModel } from '@dxos/react-ui-feed';
import * as Button from '@dxos/react-ui/Button';
import * as Field from '@dxos/react-ui/Field';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import { type Message } from '@dxos/types';
import { type XmlWidgetRegistry } from '@dxos/ui-editor';

import { type InputImage } from '../../client/types.ts';
import { RETRY, RUN_ROLE } from '../../model/trajectory.ts';
import { LighthouseNamespace } from '../../namespace.ts';
import { AttachButton, AttachmentStrip, useAttachments } from '../ImageAttach/ImageAttach.tsx';
import { ResultPills } from '../ResultPills/ResultPills.tsx';

/** The thread's widgets beyond the assistant defaults: lighthouse results and picks render as pills. */
const REGISTRY: XmlWidgetRegistry = {
  surface: {
    block: true,
    // A run row is one collapsed line until opened; the picks are a list.
    estimatedHeight: ({ role }) => (role === RUN_ROLE ? 36 : 160),
    heightMode: 'min',
    Component: ResultPills,
  },
};

export type ResearchThreadProps = {
  messages: readonly Message.Message[];
  /** A turn is in flight: a follow-up is queued until it ends. */
  busy?: boolean;
  disabled?: boolean;
  /** Sends a follow-up; `model: 'default'` is the Retry path (a model error usually means its provider is unusable). */
  onSend?: (text: string, options?: { model?: string; images?: InputImage[] }) => Promise<void> | void;
};

/** The thread. Mounted once there are messages, so the feed model starts with the whole history. */
const Thread = ({
  messages,
  onEvent,
}: {
  messages: readonly Message.Message[];
  onEvent: (event: ChatThreadEvent) => void;
}) => {
  const model = useFeedModel(messages, { stops: 'prompt' });
  return (
    <ChatThread.Root model={model} viewType='normal' registry={REGISTRY} rewind={false} onEvent={onEvent} tailLines={2}>
      <ChatThread.Viewport />
    </ChatThread.Root>
  );
};

/**
 * The session's steering thread, as lighthouse's own web UI shows it: the trajectory as an assistant ChatThread, with
 * a composer below for follow-ups. Results land in the masonry, not here.
 */
export const ResearchThread = ({ messages, busy, disabled, onSend }: ResearchThreadProps) => {
  const { t } = Hooks.useTranslation(LighthouseNamespace.key);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const attachments = useAttachments();

  const send = useCallback(
    async (text: string, options?: { model?: string; withImages?: boolean }) => {
      if (!text.trim() || !onSend) {
        return;
      }
      setSending(true);
      try {
        const images = options?.withImages ? attachments.payload() : [];
        await onSend(text.trim(), {
          ...(options?.model ? { model: options.model } : {}),
          ...(images.length ? { images } : {}),
        });
        setDraft('');
        if (options?.withImages) {
          attachments.clear();
        }
      } finally {
        setSending(false);
      }
    },
    [onSend, attachments],
  );

  const handleEvent = useCallback(
    (event: ChatThreadEvent) => {
      if (event.type === 'submit') {
        void (event.text === RETRY ? send(t('retry.message'), { model: 'default' }) : send(event.text));
      }
    },
    [send, t],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        void send(draft, { withImages: true });
      }
    },
    [draft, send],
  );

  return (
    <Layout.Flex column grow>
      <Layout.Flex column grow data-testid='lighthouse.thread'>
        {messages.length > 0 && <Thread messages={messages} onEvent={handleEvent} />}
      </Layout.Flex>
      <AttachmentStrip attachments={attachments} />
      <Layout.Grid
        cols={['min', 'fill', 'min']}
        gap='sm'
        align='end'
        classNames='p-trim-md border-t border-separator'
        {...attachments.dropTarget}
        data-dragging={attachments.dragging || undefined}
      >
        <AttachButton attachments={attachments} disabled={disabled} />
        <Field.Root>
          <Input.Textarea
            rows={2}
            disabled={disabled}
            aria-label={t('composer.label')}
            placeholder={t(busy ? 'composer-busy.placeholder' : 'composer.placeholder')}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            data-testid='lighthouse.composer'
          />
        </Field.Root>
        <Button.Root
          variant='primary'
          icon='ph--paper-plane-right--regular'
          iconOnly
          label={t('send.label')}
          disabled={disabled || sending || !draft.trim()}
          onClick={() => void send(draft, { withImages: true })}
        />
      </Layout.Grid>
    </Layout.Flex>
  );
};
