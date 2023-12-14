//
// Copyright 2023 DXOS.org
//

import type { Extension } from '@codemirror/state';
import { useEffect, useMemo } from 'react';
import { yCollab } from 'y-codemirror.next';

import { generateName } from '@dxos/display-name';
import { isDocAccessor } from '@dxos/echo-schema';
import type { ThemeMode } from '@dxos/react-ui';
import { getColorForValue } from '@dxos/react-ui-theme';
import { YText } from '@dxos/text-model';

import type { EditorModel } from './useTextModel';
import { automergePlugin } from '../automerge/automerge-plugin';

/**
 * Replication and awareness (incl. remote selection).
 * https://codemirror.net/docs/ref/#collab
 */
export const useCollaboration = (model: EditorModel, themeMode: ThemeMode): Extension | undefined => {
  const { provider, peer, content } = model;
  const extension = useMemo(() => {
    if (content instanceof YText) {
      return yCollab(content, provider?.awareness);
    } else if (isDocAccessor(content)) {
      return automergePlugin(content.handle, content.path);
    } else {
      return undefined;
    }
  }, []);

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
