//
// Copyright 2022 DXOS.org
//

import { ElementData, ElementType } from '../model';
import { ControlConstructor, ControlContext, ControlGetter } from './control';
import { EllipseControl, LineControl, PathControl, RectControl } from './types';

const constructors = {
  'ellipse': EllipseControl,
  'line': LineControl,
  'path': PathControl,
  'rect': RectControl
};

/**
 * Control factory.
 * @param type
 * @param context
 * @param elements
 * @param element
 * @param onRepaint
 * @param onSelect
 * @param onUpdate
 */
export const createControl = (
  type: ElementType,
  context: ControlContext,
  elements: ControlGetter,
  element?: ElementData<any>,
  onRepaint?,
  onSelect?,
  onUpdate?
) => {
  const Constructor: ControlConstructor<any> = constructors[type];
  if (!Constructor) {
    console.warn(`Invalid type: ${type}`);
  } else {
    return new Constructor(context, elements, element, onRepaint, onSelect, onUpdate);
  }
};
