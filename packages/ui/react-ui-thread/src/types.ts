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
  id: string;
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

/** Callbacks raised by message tiles, handled by the host. */
export type MessageCallbacks = {
  /** Delete a message by id (omit to hide the affordance). */
  onMessageDelete?: (messageId: string) => void;
  /** Accept an assistant proposal block on a message (omit to hide the affordance). */
  onAcceptProposal?: (messageId: string) => void;
};

/** Shared context provided by `Thread.Root` to its message tiles. */
export type ThreadContextValue = {
  /** Resolve presentational metadata for a message. */
  getMetadata: (message: Message.Message) => MessageMetadata;
  /** Injected renderers (e.g. object/reference tiles). */
  components: ThreadComponents;
  /** DID of the local identity; used to decide message editability. */
  identityDid?: string;
  /** When true, the author may edit their own text messages in place. */
  editable?: boolean;
} & MessageCallbacks;
