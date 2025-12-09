//
// Copyright 2025 DXOS.org
//

import { For } from 'solid-js';

import { type Message } from './types';

type ChatMessagesProps = {
  messages: Message[];
};

export const ChatMessages = (props: ChatMessagesProps) => {
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
      <For each={props.messages}>{(message) => <MessageItem message={message} />}</For>
    </scrollbox>
  );
};

const MessageItem = (props: { message: Message }) => {
  const roleColor = () => {
    switch (props.message.role) {
      case 'user':
        return '#00ffff';
      case 'assistant':
        return '#00ff00';
      case 'error':
        return '#ff0000';
      default:
        return '#ffffff';
    }
  };

  const rolePrefix = () => {
    switch (props.message.role) {
      case 'user':
        return '⟫';
      case 'assistant':
        return 'Assistant:';
      case 'error':
        return 'Error:';
      default:
        return '';
    }
  };

  return (
    <box paddingBottom={1}>
      <text>
        <span style={{ fg: roleColor() }}>{rolePrefix()}</span> {props.message.content}
      </text>
    </box>
  );
};
