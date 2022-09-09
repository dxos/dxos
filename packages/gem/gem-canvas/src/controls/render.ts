//
// Copyright 2022 DXOS.org
//

import clsx from 'clsx';
import * as d3 from 'd3';
import debug from 'debug';

import { Control } from './control';
import { elementStyles } from './styles';

const log = debug('gem:canvas:render');

/**
 * Paint the D3 controls.
 * @param controlsGroup
 * @param controlManager
 * @param debug
 */
export const renderControls = (controlsGroup, controlManager, debug = false) => {
  const modified = controlManager.getModified(controlManager, debug);

  // eslint-disable indent
  d3.select(controlsGroup)
    .selectAll<SVGElement, Control<any>>('g.control')
    .data(controlManager.controls, (control: Control<any>) => control.element.id)
    .join(enter => {
      if (enter.size()) {
        log('enter', enter.size());
      }

      // Create control groups.
      return enter
        .append('g')
        // https://developer.mozilla.org/en-US/docs/Learn/HTML/Howto/Use_data_attributes
        .attr('data-id', control => control.element.id)
        .on('click', function () {
          const control = d3.select<SVGElement, Control<any>>(this).datum();
          if (!control.editing) {
            control.onSelect(true);
          }
        })
        .on('dblclick', function () {
          const control = d3.select<SVGElement, Control<any>>(this).datum();
          if (!control.editing) {
            control.onEdit(true);
          }
        })
        .on('mouseenter', function () {
          const control = d3.select<SVGElement, Control<any>>(this).datum();
          if (!control.editing && !control.selected) {
            control.onHover(true);
          }
        })
        // TODO(burdon): Doesn't leave if dragging and exit via handle.
        .on('mouseleave', function () {
          const control = d3.select<SVGElement, Control<any>>(this).datum();
          if (!control.editing && !control.selected) {
            control.onHover(false);
          }
        });
    })

    // Update controls.
    .attr('class', d => clsx('control', elementStyles.default, elementStyles[d.data.style]))
    .each((control, i, nodes) => {
      // Draw if modified.
      if (!modified || modified.includes(control.element.id)) {
        log('update', control.element.id);
        d3.select(nodes[i]).call(control.draw());
      }
    })
    // TODO(burdon): Respect set order.
    // Pull selected to front and lines to back.
    .sort((control1: Control<any>, control2: Control<any>) => {
      const t1 = control1.element.type;
      const t2 = control2.element.type;
      if (control1.selected) {
        return 1;
      }
      if (control2.selected) {
        return -1;
      }
      return (t1 === 'line') ? -1 : (t2 === 'line') ? 1 : 0;
    });
  // eslint-enable indent
};
