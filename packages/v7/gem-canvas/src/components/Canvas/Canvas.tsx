//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';
import React, { RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/css';

import { defaultScale, Scale } from '@dxos/gem-x';

import { Tool } from '../../tools';
import { Element, ElementDataType, ElementId, ElementType } from '../../model';
import { BaseElement, DragElementFunction, DrawElementFunction, ElementCache, Mode } from '../../elements';

// TODO(burdon): Create theme.
const styles = css`
  ellipse {
    stroke: seagreen;
    stroke-width: 2;
    fill: #F5F5F5;
  }

  rect.frame {
    stroke: #999;
    stroke-width: 1;
    stroke-dasharray: 4;
    fill: none;    
  }
  
  circle.frame-handle {
    stroke: #999;
    stroke-width: 1;
    fill: #FFF;
  }
`;

interface CanvasProps {
  svgRef: RefObject<SVGSVGElement>
  scale?: Scale
  tool: Tool
  elements?: Element<any>[]
  selected?: Element<any>
  onSelect?: (element: Element<any>) => void
  onCreate?: (element: Element<any>) => void
  onUpdate?: (element: Element<any>) => void
  onDelete?: (id: ElementId) => void
}

/**
 *
 * @param svgRef
 * @param scale
 * @param tool
 * @param elements
 * @param selected
 * @param onSelect
 * @param onCreate
 * @param onUpdate
 * @param onDelete
 * @constructor
 */
export const Canvas = ({
  svgRef,
  scale = defaultScale,
  tool,
  elements = [],
  selected,
  onSelect,
  onCreate,
  onUpdate,
  onDelete
}: CanvasProps) => {
  const elementGroup = useRef<SVGSVGElement>();
  const elementCache = useMemo(() => new ElementCache(scale, onSelect, onUpdate), [scale]);

  // Update cache.
  useEffect(() => {
    elementCache.update(elements, selected);
  }, [elements, selected]);

  //
  // D3 Handlers.
  //

  useEffect(() => {
    d3.select(svgRef.current)
      .on('click', (event) => {
        const base = d3.select(event.target.parentNode).datum();
        if (!base) {
          onSelect(undefined);
        }
      });
  }, []);

  useEffect(() => {
    d3.select(elementGroup.current)
      .selectAll('g')
      .data(elementCache.elements, ({ element }: BaseElement<any>) => element.id)
      .join('g')
      .each((element, i, nodes) => {
        d3.select(nodes[i]).call(element.draw())
      });
  }, [elementGroup, elements, selected]);

  //
  // Handlers.
  //

  /*
  // TODO(burdon): Move into editor.
  const activeGroup = useRef<SVGSVGElement>();
  const [data, setData] = useState<ElementDataType>();
  const [selected, setSelected] = useState<string>();

  const handleCancel = () => {
    setSelected(undefined);
    setData(undefined);
  }

  const handleCreate = (type: ElementType, data: ElementDataType, commit: boolean) => {
    if (commit) {
      // console.log('onCreate:commit');
      setData(data);
      const element: Element<any> = {
        id: faker.datatype.uuid(),
        type,
        data
      };

      setData(undefined);
      setSelected(undefined);
      onCreate(element);
    } else {
      setData(data);
    }
  };

  const handleUpdate = (element: Element<any>, data: ElementDataType, commit: boolean) => {
    if (commit) {
      // console.log('onUpdate:commit');
      setData(data);
      element.data = data;
      onUpdate(element);
    } else {
      setSelected(element.id);
      setData(data);
    }
  }

  const handleEdit = (element: Element<any>) => {
    console.log('edit:', JSON.stringify(element));
    setSelected(element.id);
  }

  //
  // Global events.
  //
  useEffect(() => {
    d3.select(svgRef.current)
      .on('click', (event) => {
        const elementId = d3.select(event.target).datum();
        if (!elementId) {
          setData(undefined);
          setSelected(undefined);
        }
      });
  }, []);

  //
  // Create element.
  //
  useEffect(() => {
    const { drag } = elementMap[tool] ?? {};
    if (drag) {
      d3.select(svgRef.current).call(drag({ scale, onCancel: handleCancel, onCreate: handleCreate }));
    } else {
      d3.select(svgRef.current).call(d3.drag());
    }
  }, [svgRef, tool]);

  //
  // Render element.
  //
  useEffect(() => {
    // console.log('update', elements.length, selected, data);
    const cursor = (selected === undefined && data) ? { element: undefined, mode: Mode.CREATE, data } : undefined;
    const elementData = [...elements.map(element => {
      return {
        element,
        mode: (selected === element.id ? Mode.UPDATE : Mode.DEFAULT),
        data: (selected === element.id ? data : undefined) ?? element.data
      }
    }), cursor].filter(Boolean);

    d3.select(elementGroup.current)
      .selectAll('g')
      .data(elementData)
      .join('g')
      .each(({ element, mode, data }, i, nodes) => {
        const { draw } = elementMap[tool] ?? {};
        if (draw) {
          const group = d3.select(nodes[i]);
          draw({
            scale,
            group,
            element,
            data,
            mode,
            editable: true,
            onUpdate: handleUpdate,
            onEdit: () => handleEdit(element)
          });
        }
      });
  }, [elementGroup, data, elements, selected]);
  */

  return (
    <g className={styles}>
      <g ref={elementGroup} />
    </g>
  );
};
