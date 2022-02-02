//
// Copyright 2020 DXOS.org
//

import { css } from '@emotion/css';

export const styles = {
  knobs: css`
    position: absolute;
    right: 0;
    bottom: 0;
    padding: 8px;
  `,

  stats: css`
    text {
      font-family: monospace;
      font-size: 18px;
      fill: #999;
    }
  `,

  grid: css`
    path.axis {
      stroke: #AAAAAA;
    }
    path.major {
      stroke: #E5E5E5;
    }
    path.minor {
      stroke: #F0F0F0;
    }
  `,

  markers: css`
    marker {
      path.arrow {
        stroke: orange;
        stroke-width: 1;
        fill: none;
      }
    }
  `,

  graph: css`
    .guides {
      circle {
        fill: #FAFAFA;
        stroke: coral;
        stroke-width: 2;
        stroke-dasharray: 5,5;
        opacity: 0.6;
      }
    }

    circle.bullet {
      stroke: none;
      fill: red;
    }

    g.node {
      &.selected {
        circle {
          stroke: darkblue;
          fill: cornflowerblue;
        }
      }

      circle {
        stroke: seagreen;
        fill: #F5F5F5;
      }
      text {
        fill: #666
      }
    }

    path.link {
      stroke: orange;
      fill: none;
    }
  `
};
