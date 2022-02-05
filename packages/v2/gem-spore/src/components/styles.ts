//
// Copyright 2022 DXOS.org
//

import { css } from '@emotion/css';

export const defaultMarkerStyles = css`
  marker {
    &.arrow path {
      stroke: orange;
      stroke-width: 1px;
      fill: none;
    }

    &.dot circle {
      stroke: orange;
      stroke-width: 1px;
      fill: none;
    }
  }
`;

export const defaultGraphStyles = css`
  .guides {
    circle {
      fill: #FAFAFA;
      stroke: coral;
      stroke-width: 4px;
      stroke-dasharray: 15, 5;
      opacity: 0.2;
    }
  }

  circle.bullet {
    stroke: none;
    fill: #999;
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
      fill: #666;
      font-family: sans-serif;
    }
  }

  g.link {
    path {
      stroke: orange;
      stroke-width: 1;
      fill: none;
    }
    path.click {
      stroke: transparent;
      stroke-width: 16;
      opacity: 0.2;
    }
`;
