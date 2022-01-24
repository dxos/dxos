//
// Copyright 2022 DXOS.org
//

import clsx from 'clsx';
import debug from 'debug';
import * as d3 from 'd3';

const log = debug('gem:canvas:render');

import { Control } from './control';
import { elementStyles } from './styles';

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
    .attr('class', d => clsx('control', elementStyles['default'], elementStyles[d.data.style]))
    .each((control, i, nodes) => {
      // Draw if modified.
      if (!modified || modified.includes(control.element.id)) {
        log('update', control.element.id);
        d3.select(nodes[i]).call(control.draw());
      }

      // Temporarily move to the front.
      // TODO(burdon): Move frames, etc. to different group.
      if (control.active || control.hover) {
        d3.select(nodes[i]).raise();
      }
    });
  // eslint-enable indent
};
