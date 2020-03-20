//
// Copyright 2019 DxOS
//

import * as d3 from 'd3';

export const lineAdapter = d3.line()
  .x(d => d.x || 0)
  .y(d => d.y || 0);
