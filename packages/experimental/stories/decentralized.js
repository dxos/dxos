
//
// Copyright 2020 DxOS.org
//

import * as d3 from 'd3';
import React, { useEffect, useRef } from 'react';
import useResizeAware from 'react-resize-aware';

import { FullScreen } from '@dxos/gem-core';
import { makeStyles } from '@material-ui/core/styles';

export default {
  title: 'Decentralized'
};

const useStyles = makeStyles(() => ({
  container: {
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',

    '& div': {
      textAlign: 'center'
    }
  },

  inner: {
    display: 'flex',
    justifyContent: 'center',

    '& div': {
      textAlign: 'center'
    }
  },

  text: {
    fontSize: 64,
    fontFamily: 'Montserrat',
    fontWeight: 200
  }
}));

export const withLogo = () => {
  const classes = useStyles();
  const [resizeListener] = useResizeAware();
  const text = useRef();

  // https://createwithflow.com
  // TODO(burdon): Set of elements.
  // TODO(burdon): Hierarchical data structure maps to layout.
  // TODO(burdon): Mutate structure and elements over frames.
  // TODO(burdon): Transitions?

  // TODO(burdon): https://observablehq.com/@d3/selection-join

  const frames = [
    [
      [
        { id: 'x1', text: 'THE INTERNET' }
      ],
      [
        { id: 'x2', text: 'HAS BEEN COMPROMISED' }
      ],
    ],
    [
      [
        { id: 'x2', text: 'LET\'S TAKE BACK' }
      ],
      [
        { id: '_C', text: 'C', style: { 'font-weight': 800 } },
        { id: '_ON', text: 'ON'},
        { id: '_TR', text: 'TR', style: { 'font-weight': 800 }  },
        { id: '_O', text: 'O'},
        { id: '_L', text: 'L', style: { 'font-weight': 800 }  },
      ],
    ],
    // [
    //   [
    //     { id: 'x5', text: '^', style: { 'visibility': 'hidden' } }
    //   ],
    //   [
    //     { id: '_C', text: 'C', style: { 'font-weight': 800 } },
    //     { id: '_TR', text: 'TR', style: { 'font-weight': 800 }  },
    //     { id: '_L', text: 'L', style: { 'font-weight': 800 }  },
    //   ],
    // ],
    [
      [
        { id: 'x3', text: 'WE ARE' }
      ],
      [
        { id: '_DE', text: 'DE'},
        { id: '_C', text: 'C', style: { 'font-weight': 800 } },
        { id: '_EN', text: 'EN'},
        { id: '_TR', text: 'TR', style: { 'font-weight': 800 }  },
        { id: '_A', text: 'A'},
        { id: '_L', text: 'L', style: { 'font-weight': 800 }  },
        { id: '_IZED', text: 'IZED'},
      ],
    ],
    [
      [
        { id: 'x4', text: 'WE ARE' }
      ],
      [
        { id: '_1', text: 'D', style: { 'font-weight': 800 } },
        { id: '_2', text: 'x' },
        { id: '_3', text: 'OS', style: { 'font-weight': 800 } },
      ],
    ]
  ];

  const useStyle = (d, i, nodes) => {
    if (d.style) {
      const node = d3.select(nodes[i]);
      Object.keys(d.style).forEach(attr => {
        node.style(attr, d.style[attr]);
      });
    }
  };

  const render = data => {
    d3.select(text.current)
      .selectAll('div')
      .data(data)
      .join('div')
        .selectAll('span')
        .data(d => d, d => d.id)
        .join(
          enter => {
            const el = enter.append('span');
            // el.style('font-size', '1em');
            el.style('color', '#FFF').transition().duration(1000).style('color', '#333');
            // el.style('font-size', '5em');
            return el;
          },
          update => {
            // update.style('color', '#FFF').transition().duration(1000).style('color', '#111').style('font-size', '5em');
            return update;
          },
          exit => {
            return exit
              // .transition().ease(d3.easeLinear).duration(1000).style('color', '#FFF').style('font-size', '0em')
              .remove();
          })
        .text(d => d.text)
        .each(useStyle);
  };

  useEffect(() => {
    let i = 0;
    const next = () => {
      if (i === frames.length) {
        interval.stop();
        return;
      }

      render(frames[i++]);
    };

    const interval = d3.interval(next, 5000);
    next();

    return () => interval.stop();
  }, []);

  return (
    <FullScreen>
      {resizeListener}
      <div className={classes.container}>
        <div className={classes.inner}>
          <div ref={text} className={classes.text} />
        </div>
      </div>
    </FullScreen>
  );
};
