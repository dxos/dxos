//
// Copyright 2025 DXOS.org
//

import { theme } from '../../../theme.ts';

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
\u250F\u2501\u2501\u2501\u2513\u2501\u2513\u250F\u2501\u2513\u2501\u2501\u2501\u2513\u2501\u2501\u2501\u2513
\u2517\u2513\u250F\u2513\u2503\u2513\u2517\u251B\u250F\u251B\u250F\u2501\u2513\u2503\u250F\u2501\u2513\u2503
\u254B\u2503\u2503\u2503\u2503\u2517\u2513\u250F\u251B\u254B\u2503\u254B\u2503\u2503\u2517\u2501\u2501\u2513
\u254B\u2503\u2503\u2503\u2503\u250F\u251B\u2517\u2513\u254B\u2503\u254B\u2503\u2503\u2501\u2501\u2513\u2503
\u250F\u251B\u2517\u251B\u2503\u251B\u250F\u2513\u2517\u2513\u2517\u2501\u251B\u2503\u2517\u2501\u251B\u2503
\u2517\u2501\u2501\u2501\u251B\u2501\u251B\u2517\u2501\u251B\u2501\u2501\u2501\u251B\u2501\u2501\u2501\u251B
`;
