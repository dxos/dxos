//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { PublicKey } from '@dxos/react-client';
import { type SpaceMember } from '@dxos/react-client/echo';
import { type Identity } from '@dxos/react-client/halo';
import { Card, type ThemedClassName, composable, useTranslation } from '@dxos/react-ui';
import { type ObjectTileComponent, Thread } from '@dxos/react-ui-thread';
import { type Message } from '@dxos/types';
import { hoverableControls, hoverableFocusedWithinControls, mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import { getMessageMetadata } from '../../util';

export type MessageThreadProps = ThemedClassName<{
  /** Stable id used for the underlying thread root and message metadata. */
  id: string;
  /** Identity used to attribute outgoing messages in the textbox metadata. */
  identity?: Identity;
  /** Space members for rendering sender names/avatars on incoming messages. */
  members: SpaceMember[];
  /** Messages to render in order. */
  messages: readonly Message.Message[];
  /** Activity indicator (e.g. processing) shown beneath the textbox. */
  activity?: boolean;
  /** Autofocus textbox */
  autoFocus?: boolean;
  /** Marks the thread as the current/attended one. */
  current?: boolean | string;
  /**
   * When true, hide the composer textbox and activity indicator. Used for
   * channels whose source-of-truth lives elsewhere (e.g. externally-synced
   * Slack/Discord channels keyed by a foreign id) — sending isn't meaningful
   * because there is no local-write path back to the source.
   */
  readOnly?: boolean;
  /**
   * Called with the user's textbox content when they press send.
   * Returning `true` signals the message was accepted; the textbox is then cleared.
   */
  onSend: (text: string) => boolean;
}>;

/**
 * Pure message-thread UI: message list + composer textbox + activity
 * indicator, built on the `@dxos/react-ui-thread` primitives. Does not load
 * data or invoke operations — the caller passes messages and an `onSend`
 * callback. Used by `ChannelArticle` and `ThreadArticle`.
 */
export const MessageThread = composable<HTMLDivElement, MessageThreadProps>(
  ({ id, identity, members, messages, activity, onSend, autoFocus, current, readOnly, classNames }, forwardedRef) => {
    const { t } = useTranslation(meta.profile.key);

    const components = useMemo(() => ({ Object: ObjectTile }), []);

    const textboxMetadata = useMemo(() => getMessageMetadata(id, identity), [id, identity]);

    const getMetadata = useCallback(
      (message: Message.Message) => {
        // TODO(burdon): Factor out.
        const sender = members.find(
          (member) =>
            (message.sender.identityDid && member.identity.did === message.sender.identityDid) ||
            (message.sender.identityKey && PublicKey.equals(member.identity.identityKey, message.sender.identityKey)),
        );

        // Pass `message.sender` as the fallback so externally-synced messages
        // (Slack, etc.) display the source-side sender name instead of "Anonymous"
        // when no DXOS identity matches.
        return getMessageMetadata(message.id, sender?.identity, message.sender, message.created);
      },
      [members],
    );

    return (
      <Thread.Root getMetadata={getMetadata} components={components} identityDid={identity?.did} editable={false}>
        <Thread.Content id={id} current={current} classNames={['dx-container', classNames]} ref={forwardedRef}>
          <Thread.Messages messages={messages} />
          {!readOnly && (
            <>
              <Thread.Textbox
                {...textboxMetadata}
                autoFocus={autoFocus}
                placeholder={t('message.placeholder')}
                onSend={onSend}
              />
              <Thread.Status activity={activity}>{t('activity.message')}</Thread.Status>
            </>
          )}
        </Thread.Content>
      </Thread.Root>
    );
  },
);

/**
 * Object/reference message-block tile, injected into `Thread.Root` so that
 * `@dxos/react-ui-thread` stays free of `@dxos/app-framework`. Renders the
 * referenced subject via an app-framework `Surface` (the card role).
 */
const ObjectTile: ObjectTileComponent = ({ subject }) => {
  const Fallback = useCallback(() => <span className='p-1 text-sm text-description'>{subject.id}</span>, [subject]);
  return (
    <Card.Root className={mx('grid col-span-3 py-1 pr-4', hoverableControls, hoverableFocusedWithinControls)}>
      <Surface.Surface
        type={AppSurface.CardContent}
        limit={1}
        data={{ subject } satisfies AppSurface.ObjectCardData}
        fallback={Fallback}
      />
    </Card.Root>
  );
};
