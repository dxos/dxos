//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Icon, Tooltip, useTimeout } from '@dxos/react-ui';
import { Spinner } from '@dxos/react-ui-sfx';
import { errorText } from '@dxos/react-ui-theme';

export type ChatStatusIndicatorProps = {
  preset?: string;
  error?: Error;
  processing?: boolean;
};

export const ChatStatusIndicator = ({ preset, error, processing }: ChatStatusIndicatorProps) => {
  const [init, setInit] = useState(false);
  useEffect(() => {
    setInit(false);
  }, [preset]);
  useTimeout(
    async () => {
      setInit(true);
    },
    1_500,
    [preset],
  );

  if (error) {
    return (
      <Tooltip.Trigger content={error.message} delayDuration={0}>
        <Icon icon='ph--warning-circle--regular' classNames={errorText} size={5} />
      </Tooltip.Trigger>
    );
  }

  return <Spinner state={!init ? 'flash' : processing ? 'spin' : 'pulse'} />;
};
