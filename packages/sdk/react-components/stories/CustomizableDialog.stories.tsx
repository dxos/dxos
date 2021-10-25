//
// Copyright 2020 DXOS.org
//

import {
  Box,
  Button,
  TextField,
  Typography
} from '@mui/material';
import React, { useEffect, useState } from 'react';

import { ErrorBoundary } from '@dxos/react-client';

import { CustomizableDialog, CustomizableDialogProps, TestCustomizableDialog } from '../src';

export default {
  title: 'react-components/CustomizableDialog'
};

//
// Test
//

enum TestState {
  INIT,
  VALIDATE,
  DONE,
  CANCEL
}

interface TestDialogState {
  state: TestState
  value: string | undefined
  dialogProps: CustomizableDialogProps
}

const useTestDialogState = (initialState = TestState.INIT): [TestDialogState, () => void] => {
  const [state, setState] = useState<TestState>(initialState);
  const [error, setError] = useState<string | undefined>();
  const [processing, setProcessing] = useState(false);
  const [value, setValue] = useState<string>('');

  useEffect(() => {
    if (state === TestState.INIT) {
      setValue('');
    }
  }, [state]);

  const props = {
    open: true,
    processing,
    error
  };

  const handleNext = () => {
    if (!value.length) {
      setError('Invalid value.');
    } else {
      setError(undefined);
      setState(TestState.VALIDATE);
    }
  };

  const handleProcessing = () => {
    setProcessing(true);
    setTimeout((() => {
      setProcessing(false);
      setState(TestState.DONE);
    }), 1000);
  };

  const getDialogProps = (state: TestState) => {
    switch (state) {
      case TestState.INIT: {
        return {
          ...props,
          title: 'Enter Name',
          content: () => (
            <TextField
              fullWidth
              autoFocus
              value={value}
              onChange={event => setValue(event.target.value)}
            />
          ),
          actions: () => (
            <>
              <Button onClick={handleNext}>Next</Button>
              <Button onClick={() => setState(TestState.CANCEL)}>Cancel</Button>
            </>
          )
        };
      }

      case TestState.VALIDATE: {
        return {
          ...props,
          title: 'Check Name',
          content: () => (
            <Typography>Value: {value}</Typography>
          ),
          actions: () => (
            <>
              <Button onClick={() => setState(TestState.INIT)}>BACK</Button>
              <Button onClick={handleProcessing}>Done</Button>
            </>
          )
        };
      }

      default: {
        return {
          open: false
        };
      }
    }
  };

  return [{ state, value, dialogProps: getDialogProps(state) }, () => setState(TestState.INIT)];
};

export const Primary = () => {
  const [{ dialogProps, ...rest }, reset] = useTestDialogState(TestState.INIT);

  if (rest.state === TestState.DONE) {
    console.log(JSON.stringify(rest, undefined, 2));
  }

  return (
    <ErrorBoundary>
      <Button onClick={reset}>Reset</Button>

      <CustomizableDialog
        {...dialogProps}
        sx={{
          '.MuiDialog-paper': {
            minHeight: 200
          }
        }}
      />
    </ErrorBoundary>
  );
};

export const Secondary = () => {
  const [{ dialogProps, ...rest }, reset] = useTestDialogState(TestState.INIT);

  if (rest.state === TestState.DONE) {
    console.log(JSON.stringify(rest, undefined, 2));
  }

  return (
    <ErrorBoundary>
      <Button onClick={reset}>Reset</Button>

      <Box sx={{
        padding: 2,
        width: 444
      }}>
        <TestCustomizableDialog
          {...dialogProps}
        />
      </Box>
    </ErrorBoundary>
  );
};
