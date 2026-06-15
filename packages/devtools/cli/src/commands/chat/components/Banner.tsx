//
// Copyright 2025 DXOS.org
//

import { theme } from '../../../theme';

export type BannerProps = {
  version?: string;
};

export const Banner = (props: BannerProps) => {
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
      <box flexDirection='column' alignItems='flex-end'>
        <text style={{ fg: theme.accent }}>{bannerLines.join('\n')}</text>
        <text style={{ fg: theme.text.subdued }}>v{props.version}</text>
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
