//
// Copyright 2024 DXOS.org
//

import { type ComponentType } from 'react';

import { type Obj } from '@dxos/echo';
import { type Message } from '@dxos/types';
import { type FallbackValue } from '@dxos/util';

/**
 * Presentational metadata for a message author, resolved by the host (e.g. from
 * space members / identity) and supplied to the UI layer — keeps this package
 * free of `@dxos/react-client`.
 */
export type MessageMetadata = {
  id?: string;
  timestamp?: string;
  authorId?: string;
  authorName?: string;
  authorImgSrc?: string;
  authorAvatarProps?: FallbackValue;
};

/**
 * Renders an object/reference message block. Injected by the host plugin
 * (typically backed by an app-framework `Surface`) so this package stays free
 * of `@dxos/app-framework`.
 */
export type ObjectTileComponent = ComponentType<{ subject: Obj.Unknown }>;

export type ThreadComponents = {
  Object?: ObjectTileComponent;
};

/** Quick reactions offered when the host sets none — a small, culturally neutral default set. */
export const DEFAULT_REACTIONS = ['👍', '🎉', '❤️', '😄', '👀', '🚀'] as const;

/** What the thread affordance shows beneath a root message, folded by the host. */
export type MessageThreadSummary = {
  replyCount: number;
  /** Thread name, when one has been set. */
  topic?: string;
  /** ISO date of the most recent reply. */
  lastActivity?: string;
};

/**
 * A message's reactions, one entry per distinct emoji, already folded by the host — this package
 * never sees the underlying per-author reaction items.
 */
export type MessageReaction = {
  emoji: string;
  count: number;
  /** Whether the local identity is among the reactors; renders the chip as active. */
  self: boolean;
};

/** Callbacks raised by message tiles, handled by the host. */
export type MessageCallbacks = {
  /** Delete a message by id (omit to hide the affordance). */
  onMessageDelete?: (messageId: string) => void;
  /** Toggle the local identity's reaction with `emoji` (omit to hide reactions entirely). */
  onMessageReact?: (messageId: string, emoji: string) => void;
  /** Start (or open) the thread branching from a message (omit to hide the affordance). */
  onThreadOpen?: (messageId: string) => void;
  /** Accept an assistant proposal block on a message (omit to hide the affordance). */
  onAcceptProposal?: (messageId: string) => void;
  /** Accept a suggested-change block on a message (omit to hide the affordance). */
  onAcceptChange?: (messageId: string) => void;
  /** Reject a suggested-change block on a message (omit to hide the affordance). */
  onRejectChange?: (messageId: string) => void;
  /** Select a message — the host reveals what it refers to (omit to leave tiles inert). */
  onMessageSelect?: (messageId: string) => void;
};

/** Shared context provided by `Thread.Root` to its message tiles. */
export type ThreadContextValue = {
  /** The selected message, accented in the list. */
  currentMessageId?: string;
  /** Resolve presentational metadata for a message. */
  getMetadata: (message: Message.Message) => MessageMetadata;
  /** Resolve a message's folded reactions. Omit (or return empty) to render none. */
  getReactions?: (message: Message.Message) => readonly MessageReaction[];
  /** Emoji offered by the reaction picker. Defaults to {@link DEFAULT_REACTIONS}. */
  quickReactions?: readonly string[];
  /** Summary of the thread branching from a message; omit (or return undefined) for no thread. */
  getThreadSummary?: (message: Message.Message) => MessageThreadSummary | undefined;
  /**
   * Whether the delete affordance is offered for a message. Omit to offer it on every message
   * (comment threads, where the host already scopes what is rendered); channels pass an
   * author-only predicate so one participant cannot delete another's message.
   */
  canDelete?: (message: Message.Message) => boolean;
  /** Injected renderers (e.g. object/reference tiles). */
  components: ThreadComponents;
  /** DID of the local identity; used to decide message editability. */
  identityDid?: string;
  /** When true, the author may edit their own text messages in place. */
  editable?: boolean;
} & MessageCallbacks;
