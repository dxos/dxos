//
// Copyright 2022 DXOS.org
//

import { D3Callable, ScreenBounds } from '@dxos/gem-core';

// TODO(burdon): Same API as createLine (i.e., update Control).
export const createText = ({
  bounds,
  text,
  editable = false,
  onUpdate,
  onCancel
}: {
  bounds: ScreenBounds
  text: string
  editable?: boolean
  onUpdate?: (text: string) => void
  onCancel?: () => void
}): D3Callable => {
  const { x, y, width, height } = bounds;

  return group => {
    // eslint-disable indent
    group.selectAll('text')
      .data(!editable && text ? ['readonly'] : [])
      .join('text')
      .style('pointer-events', 'none')
      .style('dominant-baseline', 'central')
      .style('text-anchor', 'middle')
      .attr('x', x + width / 2)
      .attr('y', y + height / 2)
      .text(text);

    // TODO(burdon): Loses focus when hover status changes.
    group
      .selectAll('foreignObject')
      .data(editable ? ['editable'] : [])
      .join('foreignObject')
      .style('width', width)
      .style('height', height)
      .attr('x', x)
      .attr('y', y - 0.5) // Seems off by a sub-pixel (retina screen only?)

      .selectAll('input')
      .data([{ id: 'text', text }], ({ id }) => id)
      .join(enter => {
        // Create and focus.
        const input = enter.append('xhtml:input');
        if (input.node()) {
          setTimeout(() => {
            (input.node() as HTMLInputElement)?.focus();
          });
        }
        return input;
      })
      .style('width', '100%')
      .style('height', '100%')
      .style('border', 'none')
      .style('outline', 'none')
      .style('padding', 0)
      .style('text-align', 'center')
      .style('background', 'transparent')
      .attr('type', 'text')
      .property('value', d => d.text)
      .on('blur', (event) => {
        const text = (event.target as HTMLInputElement).value;
        onUpdate?.(text);
      })
      .on('keydown', (event: KeyboardEvent, d) => {
        const text = (event.target as HTMLInputElement).value;
        switch (event.key) {
          // TODO(burdon): Update when lose focus.
          case 'Enter': {
            onUpdate?.(text);
            break;
          }
          case 'Escape': {
            (event.target as HTMLInputElement).value = d.text;
            onCancel?.();
            break;
          }
        }

        event.stopPropagation();
      });
    // eslint-enable indent
  };
};
