//
// Copyright 2020 DxOS.org
//

import * as d3 from 'd3';
import faker from 'faker';
import toposort from 'toposort';
import React, { useEffect, useRef, useState } from 'react';
import useResizeAware from 'react-resize-aware';
import { withKnobs, select } from "@storybook/addon-knobs";
import { makeStyles } from '@material-ui/core/styles';

import blue from '@material-ui/core/colors/blue';
import green from '@material-ui/core/colors/green';
import orange from '@material-ui/core/colors/orange';

import {
  FullScreen,
  SVG
} from '@dxos/gem-core';

export default {
  title: 'Feeds',
  decorators: [withKnobs]
};

const useStyles = makeStyles({
  feeds: {
    '& rect': {
      strokeWidth: 1,
      stroke: green[800],
      cursor: 'pointer',
    },
    '& rect.feed-0': {
      fill: blue[200],
    },
    '& rect.feed-1': {
      fill: green[200],
    },
    '& rect.feed-2': {
      fill: orange[200],
    },
    '& path': {
      strokeWidth: 1,
      stroke: green[800],
      fill: 'none'
    }
  }
});

export const withFeeds = () => {
  const classes = useStyles();
  const [resizeListener, size] = useResizeAware();
  const [options] = useState({ size: 32, margin: 15 });
  const { width, height } = size;
  const blockGroup = useRef();
  const linkGroup = useRef();

  const layout = select('Layout', ['default', 'ordered', 'deps'], 'a');

  const [data] = useState(() => {
    // TODO(burdon): Factor out generator.
    // TODO(burdon): Generate round robin.
    const data = {
      feeds: [...new Array(3)].map(() => ({
        id: faker.random.uuid(),
        messages: []
      }))
    };

    let last;
    [...new Array(faker.random.number({ min: 20, max: 40 }))].forEach(() => {
      const { messages } = faker.random.arrayElement(data.feeds);
      const message = {
        seq: messages.length,
        id: faker.random.uuid(),
        depends: last && last.id
      };

      messages.push(message);
      last = message;
    });

    return data;
  });

  useEffect(() => {
    const { size, margin } = options;
    const center = { x: size + margin, y: size + margin };

    const line = data.feeds.reduce((result, { id }, i) => {
      result[id] = i;
      return result;
    }, {});

    const map = new Map();
    const blocks = data.feeds.reduce((blocks, { id: feed, messages }) => {
      return [...blocks, ...messages.map(message => {
        const { id, depends } = message;
        map.set(id, { feed, message });
        return [id, depends || 1];
      })];
    }, [[1, 0]]);

    const sorted = toposort(blocks).reverse();
    sorted.splice(0, 2);

    const sortedBlocks = sorted.map((id, i) => {
      const block = map.get(id);
      block.order = i;
      return block;
    });

    console.log(sortedBlocks);

    let x, y;
    switch (layout) {
      case 'deps': {
        x = d => d.order * (size + margin);
        y = () => 0;
        break;
      }

      case 'ordered': {
        x = d => d.order * (size + margin);
        y = d => line[d.feed] * (size + margin);
        break;
      }

      default: {
        x = d => d.message.seq * (size + margin);
        y = d => line[d.feed] * (size + margin);
      }
    }

    // Blocks.
    d3.select(blockGroup.current)
      .selectAll('rect')
      .data(sortedBlocks, d => d.message.id)
      .join('rect')
        // TODO(burdon): Set initial position.
        .transition()
        .attr('class', d => `feed-${line[d.feed]}`)
        .attr('x', d => center.x + x(d))
        .attr('y', d => center.y + y(d))
        .attr('width', size)
        .attr('height', size);

    // TODO(burdon): Step line.
    // https://observablehq.com/@d3/d3-line
    const lineGenerator = d3.line().curve(d3.curveStep);

    // Links.
    d3.select(linkGroup.current)
      .selectAll('path')
      .data(sortedBlocks, d => d.message.id)
      .join('path')
        .transition()
        .attr('d', d => {
          const depends = map.get(d.message.depends);
          if (depends/* && layout !== 'default'*/) {
            // TODO(burdon): If default layout then depend on previous.
            return lineGenerator([
              [center.x + x(depends) + size / 2, center.x + y(depends) + size / 2],
              [center.x + x(d) + size / 2, center.x + y(d) + size / 2]
            ]);
          }
        });

  }, [data, layout, options]);

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={width} height={height} center={false}>
        <g ref={linkGroup} className={classes.feeds} />
        <g ref={blockGroup} className={classes.feeds} />
      </SVG>
    </FullScreen>
  );
};
