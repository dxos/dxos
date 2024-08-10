//
// Copyright 2024 DXOS.org
//

import { Excalidraw, MainMenu } from '@excalidraw/excalidraw';
import { type ExcalidrawElement, type ExcalidrawProps } from '@excalidraw/excalidraw/types';
import React, { useState } from 'react';

import { log } from '@dxos/log';
import { useThemeContext } from '@dxos/react-ui';

class ExcalidrawModel {
  // NOTE: Elements are mutable by the component so need to track the last version.
  private readonly _elements = new Map<string, ExcalidrawElement>();
  private readonly _versions = new Map<string, number>();
  private readonly _modified = new Set<string>();

  get elements(): readonly ExcalidrawElement[] {
    return Object.values(this._elements);
  }

  update(elements: readonly ExcalidrawElement[]): string[] {
    return elements
      .map((element) => {
        if (element.version !== this._versions.get(element.id)) {
          this._elements.set(element.id, element);
          this._versions.set(element.id, element.version);
          this._modified.add(element.id);
          return element.id;
        }

        return undefined;
      })
      .filter(Boolean) as string[];
  }

  getModified(clear = false): ExcalidrawElement[] {
    const elements = Array.from(this._modified)
      .map((id) => this._elements.get(id))
      .filter(Boolean) as ExcalidrawElement[];
    if (clear) {
      this._modified.clear();
    }
    return elements;
  }
}

export type SketchComponentProps = any;

/**
 * https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props
 */
export const SketchComponent = ({ className }: SketchComponentProps) => {
  const { themeMode } = useThemeContext();
  const [model] = useState<ExcalidrawModel>(new ExcalidrawModel());
  const [down, setDown] = useState<boolean>(false);
  // const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);

  // TODO(burdon): Update model.
  const handleSave = () => {
    const modified = model.getModified(true);
    if (modified.length) {
      log.info('handlePointerUpdate', { modified });
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
