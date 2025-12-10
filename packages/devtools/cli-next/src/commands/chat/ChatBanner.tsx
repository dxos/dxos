//
// Copyright 2025 DXOS.org
//

import { type Accessor, Show } from 'solid-js';

import { theme } from './theme';

type ChatBannerProps = {
  visible: Accessor<boolean>;
  version?: string;
};

export const ChatBanner = (props: ChatBannerProps) => {
  const bannerLines = BANNER.split('\n').filter((line) => line.trim().length > 0);

  return (
    <Show when={props.visible()}>
      <box
        position='absolute'
        top={0}
        left={0}
        right={0}
        bottom={0}
        flexDirection='column'
        alignItems='center'
        justifyContent='center'
      >
        <box flexDirection='column' alignItems='center'>
          <text style={{ fg: theme.border }}>{bannerLines.join('\n')}</text>
          <text style={{ fg: theme.text.subdued }}>{props.version ?? 'v0.8.3'}</text>
        </box>
      </box>
    </Show>
  );
};

const BANNER = `
┏━━━┓━┓┏━┓━━━┓━━━┓
┗┓┏┓┃┓┗┛┏┛┏━┓┃┏━┓┃
╋┃┃┃┃┗┓┏┛╋┃╋┃┃┗━━┓
╋┃┃┃┃┏┛┗┓╋┃╋┃┃━━┓┃
┏┛┗┛┃┛┏┓┗┓┗━┛┃┗━┛┃
┗━━━┛━┛┗━┛━━━┛━━━┛
`;
