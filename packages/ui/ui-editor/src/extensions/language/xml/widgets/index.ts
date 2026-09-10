//
// Copyright 2025 DXOS.org
//

import { XmlWidgetProps, XmlWidgetRegistry } from '../xml-tags';
import { AnchorWidget } from './anchor';

export * from './anchor';

/**
 * Default widget registry.
 */
export const xmlWidgetRegistry: XmlWidgetRegistry = {
  'link-preview': {
    block: false,
    urlSchemes: ['dxn:', 'echo:'],
    factory: ({ label, dxn }: XmlWidgetProps<{ label: string; dxn: string }>) => {
      return typeof label === 'string' && typeof dxn === 'string' ? new AnchorWidget(label, dxn) : null;
    },
  },
};
