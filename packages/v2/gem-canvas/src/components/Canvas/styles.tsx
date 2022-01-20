//
// Copyright 2022 DXOS.org
//

import { css } from '@emotion/css';
import React from 'react';

// TODO(burdon): Create theme (single object).
export const canvasStyles = css`
  marker {
    path.arrow {
      stroke: #666;
      fill: none;
    }
  }

  g.element, g.cursor {
    circle, ellipse, line, path, polygon, polyline, rect {
      stroke: #666;
      stroke-width: 2;
      fill: #F5F5F5;
      opacity: 0.7;
    }
    
    text, input {
      font-size: 18px;
      font-family: sans-serif;
    }

    // TODO(burdon): Create separate group for frames/handles.
 
    input {
      border: none;
      outline: none;
    }
  
    rect.frame {
      stroke: cornflowerblue;
      stroke-width: 1;
      fill: none;    
    }
    
    circle.frame-handle {
      stroke: cornflowerblue;
      stroke-width: 1;
      fill: #EEE;
    }
  
    circle.connection-handle {
      stroke: none;
      fill: cornflowerblue;
    }
  
    rect.line-touch {
      stroke: none;
      fill: transparent;
    }
  }
`;

export const debugStyles = css`
  g.element, g.cursor {
    rect.line-touch {
      fill: pink;
    }
  }
`;
