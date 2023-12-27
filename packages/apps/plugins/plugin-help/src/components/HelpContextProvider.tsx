//
// Copyright 2023 DXOS.org
//

import get from 'lodash.get';
import React, { type PropsWithChildren, useEffect, useState } from 'react';
import Joyride, { ACTIONS, EVENTS, type Step, type StoreHelpers } from 'react-joyride';

import { useThemeContext } from '@dxos/react-ui';
import { tailwindConfig, type TailwindConfig } from '@dxos/react-ui-theme';

import { floaterProps, Tooltip } from './Tooltip';
import { HelpContext } from '../types';

export const tokens: TailwindConfig['theme'] = tailwindConfig({}).theme;

export const HelpContextProvider = ({
  children,
  steps: initialSteps,
  running: initialRunning = false,
}: PropsWithChildren<{ steps: Step[]; running?: boolean }>) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [running, setRunning] = useState(initialRunning);
  const [steps, setSteps] = useState(initialSteps);
  const [helpers, setHelpers] = useState<StoreHelpers>();
  useEffect(() => setRunning(initialRunning), [initialRunning]);
  const { themeMode } = useThemeContext();

  const handleGo = (index: number) => {
    setRunning(false);
    helpers!.close();
    // TODO(burdon): This works but is idiosyncratic.
    setTimeout(() => {
      setStepIndex(index);
      setRunning(true);
    });
  };

  // https://docs.react-joyride.com/callback
  const callback: Joyride['callback'] = ({ type, action, index, size }) => {
    // console.log('callback', { type, action, index, size });

    switch (type) {
      case EVENTS.STEP_AFTER:
        switch (action) {
          case ACTIONS.NEXT:
            if (index < size - 1) {
              setStepIndex(index + 1);
            }
            break;
          case ACTIONS.PREV:
            if (index > 0) {
              setStepIndex(index - 1);
            }
            break;
          case ACTIONS.CLOSE:
            setRunning(false);
            setStepIndex(0);
            break;
        }
        break;
    }
  };

  return (
    <HelpContext.Provider
      value={{
        running,
        steps,
        setSteps: (steps) => setSteps(steps),
        setIndex: (index) => handleGo(index),
        start: () => setRunning(true),
        stop: () => setRunning(false),
      }}
    >
      <Joyride
        continuous={true}
        // spotlightClicks={true}
        disableOverlay={true}
        // disableOverlayClose={true}
        steps={steps}
        stepIndex={stepIndex}
        run={running}
        callback={callback}
        floaterProps={floaterProps}
        tooltipComponent={Tooltip}
        getHelpers={(helpers) => setHelpers(helpers)}
        styles={{
          options: {
            // TODO(burdon): Better way to normalize theme?
            arrowColor: get(tokens, themeMode === 'dark' ? 'extend.colors.neutral.925' : 'extend.colors.white'),
          },
        }}
      />
      {children}
    </HelpContext.Provider>
  );
};

console.log(tokens);
