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
      stroke-width: 2;
    }
    text, input {
      font-size: 18px;
      font-family: sans-serif;
    }
  `),

  // Custom.
  'style-1': css(`
    circle, ellipse, line, path, polygon, polyline, rect {
      fill: #e3f2fd;
      stroke: #1e88e5;
    }
  `),
  'style-2': css(`
    circle, ellipse, line, path, polygon, polyline, rect {
      fill: #e0f2f1;
      stroke: #00897b;
    }
  `),
  'style-3': css(`
    circle, ellipse, line, path, polygon, polyline, rect {
      fill: #fbe9e7;
      stroke: #f4511e;
    }
  `),
};

export const canvasStyles = css`
  marker {
    path.arrow {
      stroke: #666;
      fill: none;
    }
  }

  // TODO(burdon): Scope handles.
  g.control, g.cursor {
    input {
      border: none;
      outline: none;
    }

    rect.frame-border {
      fill: none;    
      stroke: #1565c0;
      stroke-width: 1;
    }
    
    circle.frame-handle {
      fill: #bbdefb;
      stroke: #1565c0;
      stroke-width: 1;
    }
  
    circle.connection-handle {
      fill: #fafafa;
      stroke: #1565c0;
      stroke-width: 1;
    }
  
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

export const styleNames = ['style-1', 'style-2', 'style-3'];
