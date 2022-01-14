//
// Copyright 2022 DXOS.org
//

import { Scale } from '@dxos/gem-x';

import { Element, ElementType } from '../model';
import { EllipseElement, LineElement, PathElement, RectElement } from './types';

/**
 * Create element wrapper.
 * @param scale
 * @param type
 * @param element
 * @param onRepaint
 * @param onSelect
 * @param onUpdate
 */
export const createElement = (scale: Scale, type: ElementType, element?: Element<any>, onRepaint?, onSelect?, onUpdate?) => {
  // TODO(burdon): Convert to factory?
  switch (type) {
    case 'ellipse': {
      return new EllipseElement(scale, element, onRepaint, onSelect, onUpdate);
    }

    case 'line': {
      return new LineElement(scale, element, onRepaint, onSelect, onUpdate);
    }

    case 'path': {
      return new PathElement(scale, element, onRepaint, onSelect, onUpdate);
    }

    case 'rect': {
      return new RectElement(scale, element, onRepaint, onSelect, onUpdate);
    }

    default: {
      console.warn(`Invalid type: ${type}`);
    }
  }
};
