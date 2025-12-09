//
// Copyright 2025 DXOS.org
//

import { type Accessor } from 'solid-js';

import { type ModelName } from '@dxos/ai';

type ChatStatusBarProps = {
  isStreaming: Accessor<boolean>;
  spinnerFrame: Accessor<string>;
  model: ModelName;
};

export const ChatStatusBar = (props: ChatStatusBarProps) => {
  return (
    <box height={1} flexDirection='row' paddingLeft={2} paddingRight={2}>
      <text style={{ fg: props.isStreaming() ? '#00ffff' : '#666666' }}>
        {props.isStreaming() ? `${props.spinnerFrame()} Processing` : 'Ctrl-c'}
      </text>
      <box flexGrow={1} />
      <text style={{ fg: '#666666' }}>{props.model} | Ⓓ Ⓧ Ⓞ Ⓢ</text>
    </box>
  );
};
