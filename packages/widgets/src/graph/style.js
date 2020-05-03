//
// Copyright 2019 DxOS.org
//

import blue from '@material-ui/core/colors/blue';
import red from '@material-ui/core/colors/red';

export class GraphStyleBuidler {

  static default = new GraphStyleBuidler().build;

  get build() {
    return {
      '& g.orbit circle': {
        'fill': 'transparent',
        'stroke': blue[100]
      },

      '& g.node circle': {
        'fill': 'white',
        'stroke': blue[700]
      },

      '& g.highlight circle': {
        'fill': blue[50]
      },

      '& g.dragging circle': {
        'fill': blue[300]
      },

      '& g.fixed circle': {
        'fill': blue[500]
      },

      '& text': {
        'font-family': 'Roboto',
        'cursor': 'pointer',
        '-webkit-user-select': 'none',
        '-moz-user-select': 'none',
        '-ms-user-select': 'none',
        'user-select': 'none'
      },

      '& circle.dot': {
        'fill': red[500],
        'stroke': red[300]
      },

      '& path': {
        'stroke': blue[900]
      }
    };
  }
}
