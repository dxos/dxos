//
// Copyright 2022 DXOS.org
//

import { css } from '@emotion/css';

// TODO(burdon): Use MUI colors (https://mui.com/customization/color).
export const elementStyles = {
  // Default styles.
  'default': css(`
    circle, ellipse, line, path, polygon, polyline, rect {
      fill: #fafafa; // 50
      stroke: #757575; // 600;
      stroke-width: 1;
    }
    text, input {
      font-size: 18px;
      font-family: sans-serif;
    }
    line {
      stroke: #111; // 600;
    }
  `),

  // Custom.
  'style-1': css(`
    circle, ellipse, line, path, polygon, polyline, rect {
      fill: #eceff1;
      stroke: #546e7a;
    }
  `),
  'style-2': css(`
    circle, ellipse, line, path, polygon, polyline, rect {
      fill: #e3f2fd;
      stroke: #1e88e5;
    }
  `),
  'style-3': css(`
    circle, ellipse, line, path, polygon, polyline, rect {
      fill: #e0f2f1;
      stroke: #00897b;
    }
  `),
  'style-4': css(`
    circle, ellipse, line, path, polygon, polyline, rect {
      fill: #fbe9e7;
      stroke: #f4511e;
    }
  `),
  'style-5': css(`
    circle, ellipse, line, path, polygon, polyline, rect {
      fill: #f3e5f5;
      stroke: #8e24aa;
    }
  `)
};

export const canvasStyles = css`
  // TODO(burdon): Scope by element.
  height: inherit;

  marker {
    path.arrow {
      stroke: #111;
      fill: none;
    }
  }

  // TODO(burdon): Scope handles.
  g.control, g.cursor {
    input {
      border: none;
      outline: none;
    }
    
    g.frame {
      rect.frame-border {
        fill: none;
        stroke: #1565c0;
        stroke-width: 1;
      }

      g.resize-handles {
        circle {
          fill: #bbdefb;
          stroke: #1565c0;
          stroke-width: 1;
        }
      }
    }

    g.control-handles {
      circle {
        fill: #bbdefb;
        stroke: #1565c0;
        stroke-width: 1;
      }
    }

    g.connection-handles {
      circle {
        fill: #fafafa;
        stroke: #1565c0;
        stroke-width: 1;
      }
      circle.target {
        fill: orange;
        stroke: darkred;
        stroke-width: 2;
      }
    }

    // TODO(burdon): Replace with path.  
    rect.line-touch {
      fill: transparent;
      stroke: none;
    }
  }
`;

export const debugStyles = css`
  g.control, g.cursor {
    rect.line-touch {
      fill: pink;
      opacity: 0.5;
    }
  }
`;

export const styleNames = ['style-1', 'style-2', 'style-3', 'style-4', 'style-5'];
