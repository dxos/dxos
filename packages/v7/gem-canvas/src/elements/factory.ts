//
// Copyright 2022 DXOS.org
//

import { Scale } from '@dxos/gem-x';

import { Element, ElementType } from '../model';
import { EllipseElement, LineElement, PathElement, RectElement } from './types';
import { ElementCache } from './cache';
import { BaseElementConstructor } from './base';

const constructors = {
  'ellipse': EllipseElement,
  'line': LineElement,
  'path': PathElement,
  'rect': RectElement
};

/**
 * Create element wrapper.
 * @param type
 * @param cache
 * @param scale
 * @param element
 * @param onRepaint
 * @param onSelect
 * @param onUpdate
 */
export const createElement = (
  type: ElementType,
  cache: ElementCache,
  scale: Scale,
  element?: Element<any>,
  onRepaint?,
  onSelect?,
  onUpdate?
) => {
  const Constructor: BaseElementConstructor<any> = constructors[type];
  if (!Constructor) {
    console.warn(`Invalid type: ${type}`);
  } else {
    return new Constructor(cache, scale, element, onRepaint, onSelect, onUpdate);
  }
};
