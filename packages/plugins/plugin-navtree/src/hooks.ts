//
// Copyright 2025 DXOS.org
//

import { useEffect } from 'react';

import { type Node } from '@dxos/app-graph';

import { useNavTreeContext } from './components';

export const useLoadDescendents = (root?: Node.Node) => {
  const { loadDescendents } = useNavTreeContext();
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (root) {
        void loadDescendents?.(root);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [root]);
};
