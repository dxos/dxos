//
// Copyright 2022 DXOS.org
//

import { css } from '@emotion/css';
import clsx from 'clsx';

// TODO(burdon): Replace with tailwind.

export const defaultStyles = {
  markers: css`
    marker {
      &.arrow path {
        fill: none;
        stroke: #333;
        stroke-width: 1px;
      }

      &.dot circle {
        fill: none;
        stroke: #333;
        stroke-width: 1px;
      }
    }
  `,

  guides: css`
    g.guides {
      circle {
        fill: #fafafa;
        stroke: coral;
        stroke-width: 4px;
        stroke-dasharray: 15, 5;
        opacity: 0.2;
      }
    }
  `,

  nodes: css`
    g.nodes {
      .selected {
        circle {
          fill: cornflowerblue;
          stroke: #333;
          stroke-width: 2px;
        }
      }

      circle {
        fill: #cfd8dc;
        stroke: #333;
      }
      circle.highlight {
        fill: #607d8b;
        stroke: #333;
        stroke-width: 2px;
      }
      text {
        fill: #333;
        font-family: sans-serif;
      }
    }
  `,

  links: css`
    g.links {
      path {
        fill: none;
        stroke: #333;
        stroke-width: 1px;
      }
      path.click {
        stroke: transparent;
        stroke-width: 16px;
        opacity: 0.2;
      }
    }
  `,

  bullet: css`
    circle.bullet {
      fill: #999;
      stroke: none;
    }
  `,
};

export const defaultGraphStyles = clsx([
  defaultStyles.guides,
  defaultStyles.nodes,
  defaultStyles.links,
  defaultStyles.bullet,
]);
