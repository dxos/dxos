//
// Copyright 2022 DXOS.org
//

import { defaultScale, FullScreen, Scale, SvgContainer } from '@dxos/gem-x';
import { css } from '@emotion/css';
import * as d3 from 'd3';
import faker from 'faker';
import React, { useEffect, useRef, useState } from 'react';

import { Tool } from '../../components';
import { Element, ElementDataType, ElementType } from '../../model';
import { DragElementFunction, DrawElementFunction, Mode } from './drag';
import { dragEllipse, drawEllipse } from './types';

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

// TODO(burdon): Perf test (figure out join enter/update rules).

// TODO(burdon): Start to replace old implementation.
//  - Move Test.tsx to storybook.
//  - Rewrite Editor to manage state and events.
//  - Separate group for active element.
//  - Save items (model).

// TODO(burdon): Info panel with element info.
// TODO(burdon): Use debug for logging.

// TODO(burdon): Click to select outside (e.g., to handle path click).
// TODO(burdon): Implement path next (e.g., no bounding box resize).

// TODO(burdon): Performance?
//   Re-usable closure that is just passed the data (and ID)?
//   E.g., Prevent re-render if only one element is updated. Optimize join (enter, update, delete) call.
//   When is update called? (check if data has changed?)
//   Split function calls (e.g., for basic vs. editable) to minimize unnecessary closures.
//   Make callable?

type ElementMap = {
  [index: string]: {
    drag: DragElementFunction<any>,
    draw: DrawElementFunction<any>
  }
}

const elementMap: ElementMap = {
  'ellipse': {
    drag: dragEllipse,
    draw: drawEllipse
  }
}

const testElements: Element[] = [
  {
    id: faker.datatype.uuid(),
    type: 'ellipse',
    data: {
      cx: 0,
      cy: 0,
      rx: 2,
      ry: 2
    }
  }
]

interface TestProps {
  scale?: Scale
}

export const Test = ({ scale = defaultScale }: TestProps) => {
  const svgRef = useRef<SVGSVGElement>();
  const elementGroup = useRef<SVGSVGElement>();
  const activeGroup = useRef<SVGSVGElement>();
  const [elements, setElements] = useState<Element[]>(testElements);
  const [selected, setSelected] = useState<string>();
  const [tool, setTool] = useState<Tool>('ellipse');

  // TODO(burdon): Move into editor.
  const [data, setData] = useState<ElementDataType>();

  const onCancel = () => {
    setSelected(undefined);
    setData(undefined);
  }

  const onCreate = (type: ElementType, data: ElementDataType, commit: boolean) => {
    if (commit) {
      // console.log('onCreate:commit');
      setData(data);
      const element: Element = {
        id: faker.datatype.uuid(),
        type,
        data
      };

      setData(undefined);
      setSelected(undefined);
      setElements(elements => [...elements, element]);
    } else {
      setData(data);
    }
  };

  const onUpdate = (element: Element, data: ElementDataType, commit: boolean) => {
    if (commit) {
      // console.log('onUpdate:commit');
      setData(data);
      element.data = data;
      setElements(elements => [...elements]);
    } else {
      setSelected(element.id);
      setData(data);
    }
  }

  const onEdit = (element: Element) => {
    console.log('edit:', JSON.stringify(element));
    setSelected(element.id);
  }

  //
  // Global
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
      d3.select(svgRef.current).call(drag({ scale, onCancel, onCreate }));
    } else {
      d3.select(svgRef.current).call(d3.drag());
    }
  }, [svgRef, tool]);

  //
  // Render element.
  //
  useEffect(() => {
    // console.log('update', elements.length, selected, data);
    // TODO(burdon): Maintain state in editor object.
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
            onUpdate,
            onEdit: () => onEdit(element)
          });
        }
      });
  }, [elementGroup, data, elements, selected]);

  return (
    <FullScreen style={{ backgroundColor: '#F9F9F9' }}>
      <SvgContainer ref={svgRef} grid>
        <g className={styles}>
          <g ref={elementGroup} />
          <g ref={activeGroup} />
        </g>
      </SvgContainer>
    </FullScreen>
  );
};
