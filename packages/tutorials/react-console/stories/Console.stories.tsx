//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { Box } from '@mui/material';

export default {
  title: 'react-console/Console'
};

const Dot = ({ color }: { color: string }) => (
  <div
    style={{
      width: 12,
      height: 12,
      margin: 4,
      borderRadius: '50%',
      backgroundColor: color
    }}
  />
);

const Terminal = ({ lines = [] }: { lines?: { prompt: string, output: string }[] }) => {
  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      color: '#EEE',
      backgroundColor: '#222',
      borderRadius: '8px',
      fontFamily: 'monospace',
      fontSize: 16
    }}>
      <Box sx={{
        display: 'flex',
        padding: '8px'
      }}>
        <Dot color='red' />
        <Dot color='orange' />
        <Dot color='green' />
      </Box>
      <Box sx={{
        padding: '6px 12px 12px 12px'
      }}>
        {lines.map(({ prompt, output }, i) => (
          <div
            key={i}
          >
            <div style={{ paddingBottom: 6 }}>
              <span style={{ color: 'lightblue' }}>$</span> {prompt}
            </div>
            <div style={{ paddingBottom: 6 }}>
              {output}
            </div>
          </div>
        ))}
      </Box>
    </Box>
  );
};

// TODO(burdon): Animate, colors, etc.
const lines = [
  {
    prompt: 'cd ~/',
    output: '~/'
  },
  {
    prompt: 'ls -las',
    output: 'package.json tsconfig.json dist src stories'
  },
  {
    prompt: 'yarn start',
    output: 'Starting server...'
  }
];

export const Test = () => {
  return (
    <Box sx={{ padding: 2 }}>
      <Box sx={{ display: 'flex', width: 600, height: 300 }}>
        <Terminal
          lines={lines}
        />
      </Box>
    </Box>
  );
};
