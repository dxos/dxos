//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { useTranslation } from '@dxos/react-ui';
import { Message as MessageComponent, Thread } from '@dxos/react-ui-thread';
import { Message } from '@dxos/types';
import { type GroupPolicy, type SuggestionSource } from '@dxos/ui-editor';

import { meta } from '#meta';

import { type SuggestionGroup, suggestionGroupKey, suggestionGroups } from '../../hooks';
import { getMessageMetadata } from '../../util';

export type SuggestionThreadProps = {
  /** The base document text every source is diffed against (the editor's current content). */
  base: string;
  sources: SuggestionSource[];
  group?: GroupPolicy;
  /** Human-readable author labels keyed by DID; falls back to the raw author id. */
  authorLabels?: Record<string, string>;
  /** Group keys hidden this session (rejected) — a view-only dismissal that doesn't alter the base. */
  dismissed?: ReadonlySet<string>;
  onAccept?: (group: SuggestionGroup) => void;
  onReject?: (group: SuggestionGroup) => void;
};

/**
 * The review list: one message tile per grouped change across every author's suggestion branch,
 * derived live from the base (so accepting/rejecting re-diffs the rest). Each suggestion is rendered
 * as a synthesized message carrying a `change` content-block, so it reuses the comment thread's
 * `Message.Tile` — one review surface for comments and suggestions alike.
 */
export const SuggestionThread = ({
  base,
  sources,
  group,
  authorLabels,
  dismissed,
  onAccept,
  onReject,
}: SuggestionThreadProps) => {
  const { t } = useTranslation(meta.profile.key);

  // Each visible group becomes an in-memory message with a `change` block; `byId` maps the tile's
  // message id back to its group so the Accept/Reject callbacks resolve to the durable operation.
  const { messages, byId } = useMemo(() => {
    const groups = suggestionGroups(base, sources, group).filter(
      (suggestion) => !dismissed?.has(suggestionGroupKey(suggestion)),
    );
    const byId = new Map<string, SuggestionGroup>();
    const messages = groups.map((suggestion) => {
      const message = Obj.make(Message.Message, {
        created: new Date(0).toISOString(),
        sender: { identityDid: suggestion.author, name: authorLabels?.[suggestion.author] ?? suggestion.author },
        blocks: [{ _tag: 'change', before: suggestion.removed, after: suggestion.inserted }],
      });
      byId.set(message.id, suggestion);
      return message;
    });
    return { messages, byId };
  }, [base, sources, group, dismissed, authorLabels]);

  const getMetadata = useCallback(
    (message: Message.Message) => getMessageMetadata(Obj.getURI(message), undefined, message.sender),
    [],
  );
  const handleAcceptChange = useCallback(
    (messageId: string) => {
      const suggestion = byId.get(messageId);
      if (suggestion) {
        onAccept?.(suggestion);
      }
    },
    [byId, onAccept],
  );
  const handleRejectChange = useCallback(
    (messageId: string) => {
      const suggestion = byId.get(messageId);
      if (suggestion) {
        onReject?.(suggestion);
      }
    },
    [byId, onReject],
  );

  if (messages.length === 0) {
    return <p className='pli-3 plb-2 text-sm text-subdued'>{t('no-suggestions.message')}</p>;
  }

  return (
    <Thread.Root getMetadata={getMetadata} onAcceptChange={handleAcceptChange} onRejectChange={handleRejectChange}>
      <Thread.Content id='suggestions' role='list' data-testid='suggestion-list'>
        {messages.map((message) => (
          <MessageComponent.Tile key={Obj.getURI(message)} message={message} />
        ))}
      </Thread.Content>
    </Thread.Root>
  );
};

SuggestionThread.displayName = 'SuggestionThread';
