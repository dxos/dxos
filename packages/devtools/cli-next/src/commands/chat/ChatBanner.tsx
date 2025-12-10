//
// Copyright 2025 DXOS.org
//

import { theme } from './theme';

export type ChatBannerProps = {
  version?: string;
};

export const ChatBanner = ({ version }: ChatBannerProps) => {
  const bannerLines = BANNER.split('\n').filter((line) => line.trim().length > 0);

  return (
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
      <box flexDirection='column' alignItems='right'>
        <text style={{ fg: theme.accent }}>{bannerLines.join('\n')}</text>
        <text style={{ fg: theme.text.subdued }}>v{version}</text>
      </box>
    </box>
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
