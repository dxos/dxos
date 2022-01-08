//
// Copyright 2022 DXOS.org
//

import { Scale } from '@dxos/gem-x';

import { Element, ElementType } from '../model';
import { EllipseElement } from './types';

/**
 * Create element wrapper.
 * @param scale
 * @param type
 * @param element
 * @param onSelect
 * @param onUpdate
 */
export const createElement = (scale: Scale, type: ElementType, element?: Element<any>, onSelect?, onUpdate?) => {
  // TODO(burdon): Convert to factory?
  switch (type) {
    case 'ellipse': {
      return new EllipseElement(scale, element, onSelect, onUpdate);
    }

    default: {
      throw new Error(`Invalid type: ${type}`);
    }
  }
};
