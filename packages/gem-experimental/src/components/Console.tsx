//
// Copyright 2020 DXOS.org
//

import faker from 'faker';
import React, { useState } from 'react';
import ReactConsole from 'simple-react-console';

import { makeStyles } from '@material-ui/styles';

const lineHeight = 22;

const useStyles = makeStyles({
  root: {
    '& div.container': {
      fontFamily: 'monospace',
      fontSize: 18,
      lineHeight: 1,
      height: lineHeight * 5,
      padding: 0
    }
  }
});

const Console = () => {
  const classes = useStyles();
  const [output, setOutput] = useState('scanning richburdon.com');

  const handleComplete = () => {
    const interval = setInterval(() => {
      const text = faker.lorem.sentence();
      setOutput(text);
    }, 1000);
  }

  // https://pixeledpie.com/simple-react-console/index.html
  return (
    <div className={classes.root}>
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
