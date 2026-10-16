//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';
import type * as Theme from '@dxos/react-ui/Theme';

import { meta } from '#meta';
import { Sheet } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Sheet.Sheet)]: {
        'typename.label': 'Sheet',
        'typename.label_zero': 'Sheets',
        'typename.label_one': 'Sheet',
        'typename.label_other': 'Sheets',
        'object-name.placeholder': 'New sheet',
        'add-object.label': 'Add sheet',
        'rename-object.label': 'Rename sheet',
        'delete-object.label': 'Delete sheet',
        'object-deleted.label': 'Sheet deleted',
      },
      [meta.profile.key]: {
        'plugin.name': 'Sheets',
        'cell.placeholder': 'Cell value...',

        'range-key.alignment.label': 'Align',
        'range-key.style.label': 'Style',

        'range-value.start.label': 'Align left',
        'range-value.center.label': 'Align center',
        'range-value.end.label': 'Align right',
        'range-value.softwrap.label': 'Wrap text',
        'range-value.header.label': 'Header',
        'range-value.highlight.label': 'Highlight',

        'toolbar-action.label': '{{value}}',
        'selection-overlaps-existing-comment.label': 'Selected cell already has a comment',
        'comment.label': 'Add comment',
        'comment-ranges-not-supported.label': 'Commenting on ranges is not yet supported',
        'no-cursor.label': 'Select a cell to comment',
        'add-col-before.label': 'Add column before',
        'add-col-after.label': 'Add column after',
        'delete-col.label': 'Delete column',
        'add-row-before.label': 'Add row before',
        'add-row-after.label': 'Add row after',
        'delete-row.label': 'Delete row',
        'range-list.heading': 'Ranges',
        'no-ranges.message': 'No ranges',
        'range.title': '{{position}} — {{value}}',
        'col-dropped.label': 'Deleted a column',
        'row-dropped.label': 'Deleted a row',
        'align.label': 'Text align',
        'axis-dropped.label': 'Drop axis', // TODO(burdon): What does this mean?

        'chart-actions.label': 'Chart actions',
        'add-chart.label': 'Add chart',
        'delete-chart.label': 'Delete chart',
        'use-selection.label': 'Use sheet selection as range',
        'chart-list.label': 'Charts',
        'no-charts.message': 'No charts',
        'no-chart-selected.message': 'Select a chart',
        'resize-chart-list.label': 'Resize chart list',
        'chart-description.label': '{{range}} · {{type}}',
        'chart-type.bar.label': 'Bar',
        'chart-type.pie.label': 'Pie',
        'chart-type.xy.label': 'XY',
        'invalid-range.message': 'Invalid range',
      },
    },
  },
] as const satisfies Theme.Resource[];
