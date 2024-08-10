//
// Copyright 2024 DXOS.org
//

import { Excalidraw, MainMenu, type ExcalidrawProps } from '@excalidraw/excalidraw';
import React from 'react';

import { useThemeContext } from '@dxos/react-ui';

/**
 * https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props
 */
export const SketchComponent = () => {
  const { themeMode } = useThemeContext();

  // TODO(burdon): Map ids.
  const handleChange: ExcalidrawProps['onChange'] = (e) => {
    console.log('###', e);
  };

  return (
    <div className='flex grow'>
      <Excalidraw theme={themeMode} onChange={handleChange}>
        <MainMenu></MainMenu>
      </Excalidraw>
    </div>
  );
};
