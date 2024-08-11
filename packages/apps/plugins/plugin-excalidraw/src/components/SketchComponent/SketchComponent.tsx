//
// Copyright 2024 DXOS.org
//

import { Excalidraw, MainMenu } from '@excalidraw/excalidraw';
import { type ExcalidrawProps, type ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';
import React, { useEffect, useRef, useState } from 'react';

import { type DiagramType } from '@braneframe/types';
import { log } from '@dxos/log';
import { useThemeContext } from '@dxos/react-ui';

import { useStoreAdapter } from '../../hooks';
import { type SketchGridType } from '../../types';

export type SketchComponentProps = {
  sketch: DiagramType;
  readonly?: boolean;
  className?: string;
  autoZoom?: boolean;
  maxZoom?: number;
  autoHideControls?: boolean;
  grid?: SketchGridType;
};

/**
 * https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props
 */
export const SketchComponent = ({ sketch, className }: SketchComponentProps) => {
  const { themeMode } = useThemeContext();
  const [down, setDown] = useState<boolean>(false);
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI>();
  const adapter = useStoreAdapter(sketch, ({ updated, added }) => {
    log.info('update component', { updated, added });
    excalidrawAPIRef.current?.updateScene({ elements: [...(updated ?? []), ...(added ?? [])], commitToHistory: false });
  });

  // TODO(burdon): Trigger from adapter.
  useEffect(() => {
    handleRefresh();
  }, []);

  const handleRefresh = () => {
    excalidrawAPIRef.current?.updateScene({ elements: adapter.getElements(), commitToHistory: false });
    // excalidrawAPIRef.current?.setToast({ message: 'Refresh' });
  };

  // Track updates.
  const handleChange: ExcalidrawProps['onChange'] = (elements) => {
    const modified = adapter.update(elements);
    if (!down && modified.length) {
      adapter.save();
    }
  };

  // Save updates when mouse is released.
  const handlePointerUpdate: ExcalidrawProps['onPointerUpdate'] = ({ button }) => {
    switch (button) {
      case 'down': {
        setDown(true);
        break;
      }

      case 'up': {
        if (down) {
          adapter.save();
        }
        setDown(false);
      }
    }
  };

  // TODO(burdon): https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/children-components/live-collaboration-trigger

  return (
    <div className={className}>
      <Excalidraw
        excalidrawAPI={(api) => {
          excalidrawAPIRef.current = api;
        }}
        theme={themeMode}
        onChange={handleChange}
        onPointerUpdate={handlePointerUpdate}
      >
        <MainMenu>
          <MainMenu.Item onSelect={handleRefresh}>Refresh</MainMenu.Item>
        </MainMenu>
      </Excalidraw>
    </div>
  );
};
