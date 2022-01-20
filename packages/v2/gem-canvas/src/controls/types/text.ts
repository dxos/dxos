//
// Copyright 2022 DXOS.org
//

import { Point } from '@dxos/gem-core';

import { D3Callable } from '../../types';

// TODO(burdon): Same API as createLine (i.e., update Control).
export const createText = ({
  center,
  text,
  editable = false,
  onUpdate,
  onCancel
}: {
  center: Point,
  text: string,
  editable?: boolean,
  onUpdate?: (text: string) => void,
  onCancel?: () => void
}): D3Callable => {
  const [x, y] = center;

  return group => {
    // eslint-disable indent
    group.selectAll('text')
      .data(!editable && text ? ['_readonly_'] : [])
      .join('text')
      .style('pointer-events', 'none')
      .style('dominant-baseline', 'central')
      .style('text-anchor', 'middle')
      .attr('x', x)
      .attr('y', y)
      .text(text);

    // TODO(burdon): Loses focus when hover status changes.
    group
      .selectAll('foreignObject')
      .data(editable ? ['_editable_'] : [])
      .join('foreignObject')
        .style('width', 128)
        .style('height', 32)
        .attr('x', x)
        .attr('y', y)

      .selectAll('input')
      .data([{ id: 'text', text }], ({ id }) => id)
      .join('xhtml:input')
        .style('width', '100%')
        .style('height', '100%')
        .style('border', 'none')
        .style('outline', 'none')
        .style('padding', 0)
        .style('text-align', 'center')
        // .style('background', 'transparent')
        .attr('type', 'text')
        .property('value', d => d.text)
        .on('keydown', (event: KeyboardEvent, d) => {
          const text = (event.target as HTMLInputElement).value;
          switch (event.key) {
            // TODO(burdon): Update when lose focus.
            case 'Enter': {
              onUpdate?.(text);
              break;
            }
            // TODO(burdon): Force update.
            case 'Escape': {
              (event.target as HTMLInputElement).value = d.text;
              onCancel?.();
              break;
            }
          }
        });
    // eslint-enable indent
  };
}
