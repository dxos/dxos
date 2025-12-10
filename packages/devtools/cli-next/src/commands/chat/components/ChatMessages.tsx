//
// Copyright 2025 DXOS.org
//

import { For } from 'solid-js';

import { theme } from '../theme';
import { type Message } from '../types';

export type ChatMessagesProps = {
  messages: Message[];
};

export const ChatMessages = ({ messages }: ChatMessagesProps) => {
  return (
    <scrollbox
      stickyScroll={true}
      stickyStart='bottom'
      scrollX={false}
      scrollY={true}
      verticalScrollbarOptions={{
        visible: false,
      }}
      contentOptions={{
        paddingLeft: 1,
        paddingRight: 1,
        paddingTop: 1,
        paddingBottom: 1,
      }}
      flexGrow={1}
    >
      <For each={messages}>{(message) => <MessageItem message={message} />}</For>
    </scrollbox>
  );
};

const MessageItem = (props: { message: Message }) => {
  const rolePrefix = () => {
    switch (props.message.role) {
      case 'user':
        return '⟫ ';
      case 'assistant':
        return 'Assistant: ';
      case 'error':
        return 'Error: ';
      default:
        return '';
    }
  };

  // TODO(burdon): Format fenced code blocks.
  return (
    <box paddingBottom={1}>
      <text>
        {props.message.content && <span style={{ fg: theme.role(props.message.role) }}>{rolePrefix()}</span>}
        {props.message.content}
      </text>
    </box>
  );
};
