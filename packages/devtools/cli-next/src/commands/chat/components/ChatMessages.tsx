//
// Copyright 2025 DXOS.org
//

import { For, Match, Switch } from 'solid-js';

import { theme } from '../theme';
import { type Message } from '../types';

import { Markdown } from './Markdown';

export type ChatMessagesProps = {
  messages: Message[];
};

export const ChatMessages = (props: ChatMessagesProps) => {
  return (
    <scrollbox
      flexGrow={1}
      scrollX={false}
      scrollY={true}
      stickyScroll={true}
      stickyStart='bottom'
      verticalScrollbarOptions={{
        visible: false,
      }}
    >
      <For each={props.messages}>{(message) => <MessageItem message={message} />}</For>
    </scrollbox>
  );
};

const MessageItem = (props: { message: Message }) => {
  return (
    <Switch>
      <Match when={props.message.role === 'user'}>
        <text marginLeft={1} marginRight={1}>
          <span style={{ fg: theme.role('user') }}>⟫</span> {props.message.content}
        </text>
      </Match>
      <Match when={props.message.role === 'assistant'}>
        <box marginTop={1} marginBottom={1}>
          <Markdown content={props.message.content} />
        </box>
      </Match>
      <Match when={props.message.role === 'error'}>
        <box margin={1} paddingLeft={1} paddingRight={1} borderStyle='single' borderColor={theme.log.error}>
          <text style={{ fg: theme.log.error }}>{props.message.content}</text>
        </box>
      </Match>
    </Switch>
  );
};
