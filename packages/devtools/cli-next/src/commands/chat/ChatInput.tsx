//
// Copyright 2025 DXOS.org
//

import { type Accessor } from 'solid-js';

type ChatInputProps = {
  value: Accessor<string>;
  onInput: (value: string) => void;
  onSubmit: () => void;
  focused: boolean;
};

export const ChatInput = (props: ChatInputProps) => {
  return (
    <>
      {/* Separator line */}
      <box height={1} border={['top']} borderColor='#00ff00' />

      {/* Input area */}
      <box height={4} paddingLeft={2} paddingRight={2}>
        <input
          focused={props.focused}
          placeholder='Type your message and press Enter to submit...'
          value={props.value()}
          textColor='#ffffff'
          placeholderColor='#666666'
          backgroundColor='#000000'
          onInput={(value: string) => props.onInput(value)}
          onSubmit={props.onSubmit}
        />
      </box>
    </>
  );
};
