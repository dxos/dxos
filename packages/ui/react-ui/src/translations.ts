//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = '@dxos/react-ui';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'toolbar-menu.label': 'Action menu',
        'toolbar-drag-handle.label': 'Drag to rearrange',
        'toolbar-close.label': 'Close',
        'toolbar-delete.label': 'Delete',
        'carousel-viewport.label': 'Carousel',
        'carousel-prev.label': 'Previous slide',
        'carousel-next.label': 'Next slide',
        'carousel-indicators.label': 'Carousel slides',
        'carousel-go-to.label': 'Go to slide {{index}}',
      },
    },
  },
] as const satisfies Resource[];
