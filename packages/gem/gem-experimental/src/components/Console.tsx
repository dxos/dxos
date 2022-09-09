//
// Copyright 2020 DXOS.org
//

import { css } from '@emotion/css';
import faker from 'faker';
import React, { useState } from 'react';
import ReactConsole from 'simple-react-console';

const lineHeight = 22;

const styles = css`
  '& div.container': {
    fontFamily: 'monospace',
    fontSize: 18,
    lineHeight: 1,
    height: lineHeight * 5,
    padding: 0
  }
`;

const Console = () => {
  const [output, setOutput] = useState('Initializing...');

  // TODO(burdon): Pluggable.
  const handleComplete = () => {
    const timeout = setTimeout(() => {
      const text = faker.lorem.sentence(8);
      setOutput(text);
    }, 1000);

    return () => clearTimeout(timeout);
  }

  // https://pixeledpie.com/simple-react-console/index.html
  return (
    <div className={styles}>
      <ReactConsole
        passive={true}
        scroll={false}
        delay={20}
        tag='>'
        consoleTag=' '
        setOutput={output}
        onComplete={handleComplete}
        backgroundColor='#000'
        textColor='#CCC'
      />
    </div>
  );
};

export default Console;
