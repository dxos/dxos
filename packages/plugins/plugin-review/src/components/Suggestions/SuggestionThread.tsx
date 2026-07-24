//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { Message as MessageComponent, Thread } from '@dxos/react-ui-thread';
import { Message } from '@dxos/types';
import { type GroupPolicy, type SuggestionSource } from '@dxos/ui-editor';
import { stringToFallback } from '@dxos/util';

import { type SuggestionGroup, suggestionGroupKey, suggestionGroups, suggestionHue } from '../../hooks';
import { getMessageMetadata } from '../../util';

export type SuggestionThreadProps = {
  /** The base document text every source is diffed against (the editor's current content). */
  base: string;
  sources: SuggestionSource[];
  group?: GroupPolicy;
  /** Human-readable author labels keyed by DID; falls back to the raw author id. */
  authorLabels?: Record<string, string>;
  /** Author palette hues keyed by DID; tints each suggestion's avatar to match its author colour. */
  authorHues?: Record<string, string>;
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
  authorHues,
  dismissed,
  onAccept,
  onReject,
}: SuggestionThreadProps) => {
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
    (message: Message.Message) => {
      const metadata = getMessageMetadata(Obj.getURI(message), undefined, message.sender);
      // Seed the avatar from the author DID so it agrees with the version banner's author tag: the
      // hue is the author's palette hue (identity hue when known, else a stable DID-seeded hue — the
      // same `stringToHue` the banner uses), and the emoji is coherent with that DID rather than a
      // separate name-hash fallback.
      const author = message.sender.identityDid;
      if (author) {
        metadata.authorAvatarProps = {
          emoji: stringToFallback(author).emoji,
          hue: suggestionHue(author, authorHues?.[author]),
        };
      }
      return metadata;
    },
    [authorHues],
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

  // No visible suggestions ⇒ render nothing; the companion's shared empty-state prompt (shown by
  // the container when there are neither comments nor suggestions) covers the empty case.
  if (messages.length === 0) {
    return null;
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
