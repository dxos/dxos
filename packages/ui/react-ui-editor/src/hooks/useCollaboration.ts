//
// Copyright 2023 DXOS.org
//

import type { Extension } from '@codemirror/state';
import { useEffect, useMemo } from 'react';
import { yCollab } from 'y-codemirror.next';

import { generateName } from '@dxos/display-name';
import type { ThemeMode } from '@dxos/react-ui';
import { getColorForValue } from '@dxos/react-ui-theme';
import { YText } from '@dxos/text-model';

import type { EditorModel } from './useTextModel';

/**
 * Replication and awareness (incl. remote selection).
 * https://codemirror.net/docs/ref/#collab
 */
export const useCollaboration = (model: EditorModel, themeMode: ThemeMode): Extension | undefined => {
  const { provider, peer, content } = model;
  const extension = useMemo(() => (content instanceof YText ? yCollab(content, provider?.awareness) : undefined), []);

  useEffect(() => {
    if (provider && peer) {
      provider.awareness.setLocalStateField('user', {
        name: peer.name ?? generateName(peer.id),
        color: getColorForValue({ value: peer.id, type: 'color' }),
        colorLight: getColorForValue({ value: peer.id, themeMode, type: 'highlight' }),
      });
    }
  }, [provider, peer, themeMode]);

  return extension;
};
