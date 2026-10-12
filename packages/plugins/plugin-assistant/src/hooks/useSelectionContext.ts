//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Obj } from '@dxos/echo';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import { Selection } from '@dxos/react-ui-attention/types';

import { type ChatRequestContext } from '../chat-model/index.ts';

/** Resolve `object`'s selection to text via the AnchorResolver contributed for its typename. */
export const getSelectionContext = ({
  object,
  selection,
  resolvers,
}: {
  object: Obj.Unknown;
  selection: Selection.Selection | undefined;
  resolvers: readonly AppCapabilities.AnchorResolver[];
}): ChatRequestContext | undefined => {
  const typename = Obj.getTypename(object);
  const resolver = typename ? resolvers.find((candidate) => candidate.key === typename) : undefined;
  if (!resolver) {
    return undefined;
  }

  // A stale cursor throws in Automerge; a bad range must not abort the submit.
  const resolveAnchorText = (anchor: string): string | undefined => {
    try {
      return resolver.getText(object, anchor);
    } catch {
      return undefined;
    }
  };

  // Anchors and text stay pairwise-aligned: a range that fails to resolve is dropped from both.
  const resolved = Selection.toAnchors(selection).flatMap((anchor) => {
    const text = resolveAnchorText(anchor);
    return text != null && text.length > 0 ? [{ anchor, text }] : [];
  });
  if (resolved.length === 0) {
    return undefined;
  }

  return {
    selection: {
      anchors: resolved.map(({ anchor }) => anchor),
      text: resolved.map(({ text }) => text).join('\n…\n'),
    },
  };
};

/** Submit-time provider of the companion object's current selection as request context. */
export const useSelectionContext = (companionTo: Obj.Unknown | undefined): (() => ChatRequestContext | undefined) => {
  // getAll-style lookup: absent capabilities yield empty arrays so non-companion chats stay inert.
  const [viewState] = Hooks.useCapabilities(AttentionCapabilities.ViewState);
  const resolvers = Hooks.useCapabilities(AppCapabilities.AnchorResolver);

  return useCallback(() => {
    if (!companionTo || !viewState) {
      return undefined;
    }
    const selection = viewState.get(Selection.aspect, Obj.getURI(companionTo));
    return getSelectionContext({ object: companionTo, selection, resolvers });
  }, [companionTo, viewState, resolvers]);
};
