//
// Copyright 2022 DXOS.org
//

import { Scale } from '@dxos/gem-x';

import { ElementData, ElementType } from '../model';
import { EllipseControl, LineControl, PathControl, RectControl } from './types';
import { ElementCache } from './cache';
import { ControlConstructor } from './control';

const constructors = {
  'ellipse': EllipseControl,
  'line': LineControl,
  'path': PathControl,
  'rect': RectControl
};

/**
 * Control factory.
 * @param type
 * @param cache
 * @param scale
 * @param element
 * @param onRepaint
 * @param onSelect
 * @param onUpdate
 */
export const createControl = (
  type: ElementType,
  cache: ElementCache,
  scale: Scale,
  element?: ElementData<any>,
  onRepaint?,
  onSelect?,
  onUpdate?
) => {
  const Constructor: ControlConstructor<any> = constructors[type];
  if (!Constructor) {
    console.warn(`Invalid type: ${type}`);
  } else {
    return new Constructor(cache, scale, element, onRepaint, onSelect, onUpdate);
  }
};
