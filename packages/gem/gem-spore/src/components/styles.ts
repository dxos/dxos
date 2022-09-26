//
// Copyright 2022 DXOS.org
//

import { css } from '@emotion/css';

export const defaultMarkerStyles = css`
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
`;

export const defaultGraphStyles = css`
  g.guides {
    circle {
      fill: #FAFAFA;
      stroke: coral;
      stroke-width: 4px;
      stroke-dasharray: 15, 5;
      opacity: 0.2;
    }
  }

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

  circle.bullet {
    fill: #999;
    stroke: none;
  }
`;
