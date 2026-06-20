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
        'system-button.star.label': 'Star',
        'system-button.unstar.label': 'Unstar',
        'system-button.bookmark.label': 'Bookmark',
        'system-button.unbookmark.label': 'Remove bookmark',
        'system-button.expand.label': 'Expand',
        'system-button.collapse.label': 'Collapse',
        'system-button.add.label': 'Add',
        'system-button.delete.label': 'Delete',
        'system-button.edit.label': 'Edit',
        'system-button.close.label': 'Close',
        'carousel-viewport.label': 'Carousel',
        'carousel-prev.label': 'Previous slide',
        'carousel-next.label': 'Next slide',
        'carousel-indicators.label': 'Carousel slides',
        'carousel-go-to.label': 'Go to slide {{index}}',
        'date-picker.placeholder.single.label': 'Pick a date',
        'date-picker.placeholder.range.label': 'Pick a date range',
        'date-picker.placeholder.multiple.label': 'Pick dates',
        'date-picker.clear.label': 'Clear',
        'calendar.nav.previous.label': 'Previous month',
        'calendar.nav.next.label': 'Next month',
        'calendar.footer.today.label': 'Today',
        'trigger-button.label': 'Open',
      },
    },
  },
] as const satisfies Resource[];
