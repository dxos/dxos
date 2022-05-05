//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';
import ReactDOM from 'react-dom';

import { Editor } from './Editor';
import { Replicator, useYJSModel } from './hooks';

// TODO(burdon): CSS.

const _Container = () => {
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

const EditorWithYJS = ({ id, replicator }: {
  id: string,
  replicator: Replicator
}) => {
  const model = useYJSModel(replicator, id);

  return (
    <Editor model={model} />
  );
};

export const WithYJS = ({ count = 2 }) => {
  const [replicator] = useState(new Replicator());

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
        maxHeight: '100%',
        backgroundColor: '#FAFAFA'
      }}>
        {[...new Array(count)].map((_, index) => {
          return (
            <div
              key={index} style={{
                width: '100%',
                height: '100%',
                borderRight: '1px solid #EEE'
              }}
            >
              <EditorWithYJS
                id={`editor-${index}`}
                replicator={replicator}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

const main = () => {
  ReactDOM.render(
    <WithYJS />,
    document.getElementById('root')
  );
};

main();
