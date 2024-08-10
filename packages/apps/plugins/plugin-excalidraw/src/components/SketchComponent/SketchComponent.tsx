//
// Copyright 2024 DXOS.org
//

import { Excalidraw, MainMenu } from '@excalidraw/excalidraw';
import { type ExcalidrawProps } from '@excalidraw/excalidraw/types';
import React, { useState } from 'react';

import { type DiagramType } from '@braneframe/types';
import { log } from '@dxos/log';
import { useThemeContext } from '@dxos/react-ui';

import { useModel } from '../../hooks';

export type SketchComponentProps = {
  sketch: DiagramType;
  readonly?: boolean;
  className?: string;
};

/**
 * https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props
 */
export const SketchComponent = ({ sketch, className }: SketchComponentProps) => {
  const { themeMode } = useThemeContext();
  const model = useModel(sketch);
  const [down, setDown] = useState<boolean>(false);
  // const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);

  const handleSave = () => {
    const modified = model.getModified(true);
    if (modified.length) {
      log.info('handleSave', { modified: modified.map(({ id, version }) => `${id}:${version}`).join(',') });
    }
  };

  // Track updates.
  const handleChange: ExcalidrawProps['onChange'] = (elements) => {
    const modified = model.update(elements);
    if (!down && modified.length) {
      handleSave();
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
          handleSave();
        }
        setDown(false);
      }
    }
  };

  // TODO(burdon): https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/children-components/live-collaboration-trigger

  return (
    <div className={className}>
      <Excalidraw
        // ref={(api: any) => setExcalidrawAPI(api)}
        // TODO(burdon): Load initial data.
        // initialData={{
        //   elements: model.elements,
        // }}
        theme={themeMode}
        onChange={handleChange}
        onPointerUpdate={handlePointerUpdate}
      >
        <MainMenu>
          <MainMenu.Item onSelect={() => window.alert('Test')}>Test</MainMenu.Item>
        </MainMenu>
      </Excalidraw>
    </div>
  );
};
