//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';
import ReactDOM from 'react-dom';

import { Editor } from './Editor';

// TODO(burdon): CSS.

const Container = () => {
  const [debug, setDebug] = useState();

  return (
    <div style={{
      display: 'flex',
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      overflow: 'hidden'
    }}>
      <div style={{
        display: 'flex',
        flex: 1,
        borderRight: '1px solid #EEE'
      }}>
        <div style={{
          width: '100%',
          height: '100%'
        }}>
          <Editor
            onDebug={value => setDebug(value)}
          />
        </div>
      </div>
      <div style={{
        display: 'flex',
        flexShrink: 0,
        width: 500,
        marginLeft: 8
      }}>
        <pre>{JSON.stringify(debug, undefined, 2)}</pre>
      </div>
    </div>
  );
};

const main = () => {
  ReactDOM.render(
    <Container />,
    document.getElementById('root')
  );
};

main();
