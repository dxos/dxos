//
// Copyright 2020 DxOS, Inc.
//

import { makeStyles } from '@material-ui/core/styles';
import * as colors from '@material-ui/core/colors';

const defaultColor = 'grey';
const highlightColor = 'orange';
const selectedColor = 'blue';
const guideColor = 'blueGrey';

// TODO(burdon): Builder.
export const useDefaultStyles = makeStyles({

  // TODO(burdon): Unless "> g" then overridden by outer scope.
  guides: {
    '& path': {
      strokeWidth: 2,
      stroke: colors[guideColor][400],
      fill: 'none'
    },

    '& > g > circle': {
      strokeWidth: 8,
      stroke: colors[guideColor][50],
      fill: 'none',
      opacity: .5
    }
  },

  box: ({ color = defaultColor }) => ({
    '& rect': {
      fill: 'none',
      strokeWidth: 1,
      stroke: colors[color][500]
    },

    '& text': {
      fill: colors['grey'][700],
      fontFamily: 'monospace',
      fontSize: 16
    }
  }),

  tree: ({ color = defaultColor }) => ({
    '& path': {
      fill: 'none',
      strokeWidth: 1,
      stroke: colors[color][500],
    },

    '& rect': {
      fill: 'none',
      strokeWidth: 1,
      stroke: colors[color][500]
    },

    '& circle': {
      strokeWidth: 2,
      stroke: colors[color][500],
      fill: colors[color][100],
      cursor: 'pointer'
    },

    '& text': {
      fill: colors['grey'][700],
      fontFamily: 'monospace',
      fontSize: 16
    }
  }),

  markers: ({ color = defaultColor }) => ({
    '& path.arrow': {
      fill: 'none',
      strokeWidth: .5,
      stroke: colors[color][500],
    },
  }),

  graph: ({ color = defaultColor }) => ({
    '& path': {
      fill: 'none',
      strokeWidth: 1,
      stroke: colors[color][500],
    },

    '& rect': {
      fill: colors[color][50],
      strokeWidth: 1,
      stroke: colors[color][500]
    },

    '& circle': {
      strokeWidth: 1,
      stroke: colors[color][800],
      // fill: colors[color][100],
      cursor: 'pointer'
    },
    '& circle.fixed': {
      strokeWidth: 2,
    },

    '& text': {
      fill: colors['grey'][400],
      fontFamily: 'monospace',
      fontSize: 16
    },

    '& g[state=active]': {
      '& circle': {
        strokeWidth: 2,
        stroke: colors[color][700],
        fill: colors[color][200],
      },

      '& text': {
        fontFamily: 'monospace',
        fill: colors['grey'][700]
      }
    },

    '& g.selected': {
      '& circle': {
        stroke: colors[selectedColor][700],
        fill: colors[selectedColor][500]
      }
    },

    '& g.highlight': {
      '& circle': {
        stroke: colors[highlightColor][700],
        fill: colors[highlightColor][500]
      }
    }
  })
});
