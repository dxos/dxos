//
// Copyright 2024 DXOS.org
//

import React, { Fragment } from 'react';

import { DEFAULT_OUTPUT } from '@dxos/conductor';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

import { useComputeNodeState } from '../hooks/index.ts';
import { Box, type ComputeNodeViewProps } from './common/index.ts';
import { type FeedShape } from './feed-def.ts';

export const FeedComponent = ({ node: shape }: ComputeNodeViewProps<FeedShape>) => {
  const { runtime } = useComputeNodeState(shape);
  const items = runtime.outputs[DEFAULT_OUTPUT]?.type === 'executed' ? runtime.outputs[DEFAULT_OUTPUT].value : [];

  return (
    <Box shape={shape} status={`${items.length} items`}>
      <ScrollArea.Root orientation='vertical'>
        <ScrollArea.Viewport classNames='divide-y divide-separator-subtle'>
          {[...items].map((item, i) => (
            <FeedItem key={i} classNames='p-1 px-2' item={item} />
          ))}
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Box>
  );
};

export const FeedItem = ({ classNames, item }: Util.ThemedClassName<{ item: any }>) => {
  if (typeof item !== 'object') {
    return <div className={mx(classNames, 'whitespace-pre-wrap')}>{item}</div>;
  }

  return (
    <div className={mx('grid grid-cols-[80px_1fr]', classNames)}>
      {Object.entries(item).map(([key, value]) => (
        <Fragment key={key}>
          <div className='p-1 text-xs text-fg-subtle'>{key}</div>
          <div>{typeof value === 'string' ? value : JSON.stringify(value)}</div>
        </Fragment>
      ))}
    </div>
  );
};
