//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Obj } from '@dxos/echo';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { Selection } from '@dxos/react-ui-attention';

import { type ProcessorRequestContext } from '../processor';

/** Resolve `object`'s selection to text via the AnchorResolver contributed for its typename. */
export const getSelectionContext = ({
  object,
  selection,
  resolvers,
}: {
  object: Obj.Unknown;
  selection: Selection.Selection | undefined;
  resolvers: readonly AppCapabilities.AnchorResolver[];
}): ProcessorRequestContext | undefined => {
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
export const useSelectionContext = (
  companionTo: Obj.Unknown | undefined,
): (() => ProcessorRequestContext | undefined) => {
  // getAll-style lookup: absent capabilities yield empty arrays so non-companion chats stay inert.
  const [viewState] = useCapabilities(AttentionCapabilities.ViewState);
  const resolvers = useCapabilities(AppCapabilities.AnchorResolver);

  return useCallback(() => {
    if (!companionTo || !viewState) {
      return undefined;
    }
    const selection = viewState.get(Selection.aspect, Obj.getURI(companionTo));
    return getSelectionContext({ object: companionTo, selection, resolvers });
  }, [companionTo, viewState, resolvers]);
};
