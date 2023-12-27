//
// Copyright 2023 DXOS.org
//

import { useEffect, useState } from 'react';
import type Joyride from 'react-joyride';
import { ACTIONS, EVENTS } from 'react-joyride';

export const useJoyride = (start = false) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [running, setRunning] = useState(start);
  useEffect(() => setRunning(start), [start]);

  // https://docs.react-joyride.com/callback
  const callback: Joyride['callback'] = ({ action, type, index, size }) => {
    // console.log('handleHelp', { type, action, index, size, rest });

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

      case EVENTS.TOUR_END:
        setRunning(false);
        setStepIndex(0);
        break;
    }
  };

  return { running, stepIndex, callback, start: () => setRunning(true) };
};
