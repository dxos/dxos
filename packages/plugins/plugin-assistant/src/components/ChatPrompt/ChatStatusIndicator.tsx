//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Icon, Tooltip } from '@dxos/react-ui';
import { Spinner } from '@dxos/react-ui-sfx';
import { errorText } from '@dxos/react-ui-theme';

export type ChatStatusIndicatorProps = {
  error?: Error;
  processing?: boolean;
};

export const ChatStatusIndicator = ({ error, processing }: ChatStatusIndicatorProps) => {
  if (error) {
    return (
      <Tooltip.Trigger content={error.message} delayDuration={0}>
        <Icon icon='ph--warning-circle--regular' classNames={errorText} size={5} />
      </Tooltip.Trigger>
    );
  }

  return <Spinner active={processing} />;
};
