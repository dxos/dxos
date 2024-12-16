//
// Copyright 2024 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { type DebugInfo, useSurfaceRoot } from '@dxos/app-framework';
import { Button, Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

// TODO(burdon): Move to debug panel.

export type SurfaceDebugProps = ThemedClassName<{}>;

/**
 * Show surface info.
 * NOTE: Remove from @dxos/app-framework if removing this.
 */
export const DebugSurface = ({ classNames }: SurfaceDebugProps) => {
  const context = useSurfaceRoot();
  const [surfaces, setSurfaces] = useState<DebugInfo[]>([]);
  const renderMap = useMemo(() => new Map<string, { last: number; delta: number }>(), []);
  const handleRefresh = () => {
    if (context.debugInfo) {
      setSurfaces(
        Array.from(context.debugInfo.values())
          .sort(({ created: a }, { created: b }) => a - b)
          .map((surface) => {
            const state = renderMap.get(surface.id) ?? { last: 0, delta: 0 };
            renderMap.set(surface.id, { last: surface.renderCount, delta: surface.renderCount - state.last });
            return surface;
          }),
      );
    }
  };

  return (
    <div className={mx('flex flex-col border border-separator overflow-hidden bg-modalSurface', classNames)}>
      <div className='flex flex-col h-full w-full p-2'>
        {surfaces.map(({ id, name, renderCount }) => (
          <div key={id} className='grid grid-cols-[1fr_3rem_3rem] items-center text-xs font-mono whitespace-nowrap'>
            <span className='px-1 truncate'>{name}</span>
            <span className='px-1 text-right'>{renderCount}</span>
            <span className='px-1 text-right'>{renderMap.get(id)?.delta}</span>
          </div>
        ))}
      </div>
      <div className='flex justify-center text-sm items-center'>
        <Button onClick={handleRefresh}>
          <Icon icon='ph--arrow-clockwise--regular' size={4} />
        </Button>
      </div>
    </div>
  );
};
