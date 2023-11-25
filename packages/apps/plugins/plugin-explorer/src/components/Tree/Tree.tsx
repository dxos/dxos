//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { type GraphModel } from '@dxos/gem-spore';

import { RadialTree, TidyTree } from './layout';
import { mapGraphToTreeData, type TreeNode } from './types';

export type TreeComponentProps<N> = {
  model: GraphModel<N>;
  type?: 'dendrogram' | 'radial';
  onClick?: (node?: N) => void;
};

// TODO(burdon): Pass in TypedObject.
export const Tree = <N,>({ model, type = 'radial', onClick }: TreeComponentProps<N>) => {
  const { ref, width = 0, height = 0 } = useResizeDetector();
  const [data, setData] = useState<TreeNode>();

  useEffect(() => {
    return model.subscribe(() => {
      const tree = mapGraphToTreeData(model);
      setData(tree);
    }, true);
  }, [model]);

  const size = Math.min(width, height);
  const radius = size * 0.4;
  const options = {
    width,
    height,
    radius,
    marginLeft: (width - radius * 2) / 2,
    marginRight: (width - radius * 2) / 2,
    marginTop: (height - radius * 2) / 2,
    marginBottom: (height - radius * 2) / 2,
    label: (d: any) => d.label,
  };

  useEffect(() => {
    if (width && height) {
      let el;
      switch (type) {
        case 'dendrogram': {
          el = TidyTree(data ?? {}, options as any);
          break;
        }
        case 'radial': {
          el = RadialTree(data ?? {}, options as any);
          break;
        }
      }

      if (el) {
        ref.current.firstChild?.remove();
        ref.current.append(el);
      }
    }
  }, [data, width, height]);

  return <div ref={ref} className='flex flex-1 overflow-hidden' onClick={() => onClick?.()} />;
};
