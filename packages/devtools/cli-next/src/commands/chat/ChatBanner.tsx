//
// Copyright 2025 DXOS.org
//

import { type Accessor, Show } from 'solid-js';

type ChatBannerProps = {
  visible: Accessor<boolean>;
  version?: string;
};

const BANNER = `
┏━━━┓━┓┏━┓━━━┓━━━┓
┗┓┏┓┃┓┗┛┏┛┏━┓┃┏━┓┃
╋┃┃┃┃┗┓┏┛╋┃╋┃┃┗━━┓
╋┃┃┃┃┏┛┗┓╋┃╋┃┃━━┓┃
┏┛┗┛┃┛┏┓┗┓┗━┛┃┗━┛┃
┗━━━┛━┛┗━┛━━━┛━━━┛
`;

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
          <text style={{ fg: '#00ff00' }}>{bannerLines.join('\n')}</text>
          <text style={{ fg: '#ffffff' }}>{props.version ?? 'v0.8.3'}</text>
        </box>
      </box>
    </Show>
  );
};
