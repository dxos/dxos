//
// Copyright 2025 DXOS.org
//

import { type Accessor, For, createEffect, useContext } from 'solid-js';

import { type AiService, type ModelName } from '@dxos/ai';

import { useSpinner } from '../hooks';
import { theme } from '../theme';

import { AppContext } from './App';

export type StatusBarProps = {
  model: ModelName;
  metadata?: AiService.ServiceMetadata;
  blueprints?: string[];
  processing?: Accessor<boolean>;
};

export const StatusBar = (props: StatusBarProps) => {
  const appContext = useContext(AppContext);

  const spinner = useSpinner();
  createEffect(() => {
    if (props.processing?.()) {
      spinner.start();
    } else {
      spinner.stop();
    }
  });

  return (
    <box flexDirection='row' height={1} paddingLeft={2} paddingRight={2}>
      <text style={{ fg: props.processing?.() ? theme.text.secondary : theme.text.subdued }}>
        {props.processing?.() ? `${spinner.frame()} Processing` : appContext?.hint}
      </text>
      <box flexGrow={1} />
      <box marginRight={1} flexDirection='row'>
        <For each={props.blueprints}>
          {(blueprint) => <text style={{ fg: theme.text.secondary, marginRight: 1 }}>{toCircled(blueprint[0])}</text>}
        </For>
      </box>
      <text style={{ fg: theme.text.subdued, marginRight: 1 }}>{props.model}</text>
      {props.metadata?.name && <text style={{ fg: theme.text.secondary }}>({props.metadata.name})</text>}
    </box>
  );
};

export function toCircled(char: string): string {
  const upper = char.toUpperCase();
  const code = upper.codePointAt(0);
  if (!code) return char;
  // A-Z -> Ⓐ-Ⓩ
  if (code >= 65 && code <= 90) {
    return String.fromCodePoint(0x24b6 + (code - 65));
  }
  // 1-9 -> ①-⑨
  if (code >= 49 && code <= 57) {
    return String.fromCodePoint(0x2460 + (code - 49));
  }
  // 0 -> ⓪
  if (code === 48) {
    return String.fromCodePoint(0x24ea);
  }

  return char;
}
