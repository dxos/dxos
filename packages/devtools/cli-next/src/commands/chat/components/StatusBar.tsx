//
// Copyright 2025 DXOS.org
//

import { type Accessor, createEffect, useContext } from 'solid-js';

import { type AiService, type ModelName } from '@dxos/ai';

import { useSpinner } from '../hooks';
import { theme } from '../theme';

import { AppContext } from './App';

export type StatusBarProps = {
  model: ModelName;
  metadata?: AiService.ServiceMetadata;
  processing: Accessor<boolean>;
};

export const StatusBar = (props: StatusBarProps) => {
  const context = useContext(AppContext);

  const spinner = useSpinner();
  createEffect(() => {
    if (props.processing()) {
      spinner.start();
    } else {
      spinner.stop();
    }
  });

  return (
    <box flexDirection='row' height={1} paddingLeft={2} paddingRight={2}>
      <text style={{ fg: props.processing() ? theme.text.secondary : theme.text.subdued }}>
        {props.processing() ? `${spinner.frame()} Processing` : context.hints?.join(' | ')}
      </text>
      <box flexGrow={1} />
      {props.metadata?.name && (
        <text style={{ fg: theme.text.secondary, marginRight: 1 }}>({props.metadata.name})</text>
      )}
      <text style={{ fg: theme.text.subdued, marginRight: 1 }}>{props.model}</text>
      <text style={{ fg: theme.accent }}>Ⓓ Ⓧ Ⓞ Ⓢ</text>
    </box>
  );
};
