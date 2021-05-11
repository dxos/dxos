import React, { useState } from 'react';
import { hot } from 'react-hot-loader';
import logo from '@assets/images/dxos.png';
import './Application.less';

type Props = {
  title: string;
  version: string;
};

const Application: React.FC<Props> = (props) => {
  const [counter, setCounter] = useState(0);

  return (
    <React.Fragment>
      <main>
        <div className='main-heading'>
          <img src={logo} width='32' title='Codesbiome' />
          <h1>{props.title}</h1>
        </div>
        <p className='main-teaser'>
          Custom boilerplate for rapid development of Web Applications.
          <br />
          This project makes use of React, Webpack, TypeScript to
          serve the best environment for development with hot-reloading of
          modules.
        </p>
        <div className='versions'>
          <span>
            RWT <span>{props.version}</span>
          </span>
          <span>
            React <span>{React.version}</span>
          </span>
        </div>
        <p className='main-teaser small'>
          Click below button to update the application &quot;counter&quot;
          state. Components will update their states using
          Hot-Module-Replacement technique, without needing to refresh/reload
          whole application.
        </p>
        <br />
        <button onClick={() => setCounter(counter + 1)}>
          Counter <span>{counter}</span>
        </button>
      </main>
    </React.Fragment>
  );
};

export default hot(module)(Application);
