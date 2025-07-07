//
// Copyright 2023 DXOS.org
//

export const translationKey = 'react-ui-stack';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'resize label': 'Drag to resize',
        'drag handle label': 'Drag to rearrange',
        'pin start label': 'Pin to the left sidebar',
        'pin end label': 'Pin to the right sidebar',
        'increment start label': 'Move to the left',
        'increment end label': 'Move to the right',
        'close label': 'Close',
        'minify label': 'Minify',
      },
    },
  },
] as const;

export default translations;
