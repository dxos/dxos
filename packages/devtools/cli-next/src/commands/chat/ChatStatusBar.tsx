//
// Copyright 2025 DXOS.org
//

import { type Accessor, createEffect } from 'solid-js';

import { type ModelName } from '@dxos/ai';

import { useSpinner } from './hooks';
import { theme } from './theme';

export type ChatStatusBarProps = {
  isStreaming: Accessor<boolean>;
  model: ModelName;
};

export const ChatStatusBar = ({ isStreaming, model }: ChatStatusBarProps) => {
  const spinner = useSpinner();
  createEffect(() => {
    if (isStreaming()) {
      spinner.start();
    } else {
      spinner.stop();
    }
  });

  return (
    <box height={1} flexDirection='row' paddingLeft={2} paddingRight={2}>
      <text style={{ fg: isStreaming() ? theme.text.primary : theme.text.subdued }}>
        {isStreaming() ? `${spinner.frame()} Processing` : 'Ctrl-c'}
      </text>
      <box flexGrow={1} />
      <text style={{ fg: theme.text.subdued, marginRight: 1 }}>{model}</text>
      <text style={{ fg: theme.accent }}>Ⓓ Ⓧ Ⓞ Ⓢ</text>
    </box>
  );
};
