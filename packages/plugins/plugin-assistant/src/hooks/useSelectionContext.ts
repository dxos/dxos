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

  const anchors = Selection.toAnchors(selection);
  const parts = anchors
    .map((anchor) => resolver.getText(object, anchor))
    .filter((text): text is string => text != null && text.length > 0);
  if (parts.length === 0) {
    return undefined;
  }

  return { selection: { anchors, text: parts.join('\n…\n') } };
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
