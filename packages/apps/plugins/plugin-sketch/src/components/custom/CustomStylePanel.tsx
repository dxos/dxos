//
// Copyright 2024 DXOS.org
//

import { useEditor } from '@tldraw/editor';
import { DefaultStylePanelContent, type TLUiStylePanelProps, useRelevantStyles } from '@tldraw/tldraw';
import React, { memo, useCallback } from 'react';

import { mx } from '@dxos/react-ui-theme';

export const CustomStylePanel = memo(({ isMobile }: TLUiStylePanelProps) => {
  // const isDarkMode = useIsDarkMode();
  // const theme = getDefaultColorTheme({ isDarkMode });
  const editor = useEditor();

  const styles = useRelevantStyles();

  // NOTE: UX seems to depend on specific value DefaultFontStyle.
  // const s2 = Array.from(s1?.entries() ?? []);
  // const s3 = s2.map(([key, value]) => (key.id === 'tldraw:font' ? [CustomFontStyle, value] : [key, value]));
  // const styles = new ReadonlySharedStyleMap(s3);

  const handlePointerLeave = useCallback(() => {
    if (!isMobile) {
      editor.updateInstanceState({ isChangingStyle: false });
    }
  }, [editor, isMobile]);

  if (!styles) {
    return null;
  }

  // const font = styles.get(DefaultFontStyle);
  // const hideText = font === undefined;

  // TODO(burdon): Currently the global STYLES (fonts, colors, etc.) are not pluggable.
  // TODO(burdon): Implement custom style panel to replace fonts.
  // https://github.com/tldraw/tldraw/blob/main/apps/examples/src/examples/custom-style-panel/CustomStylePanelExample.tsx
  return (
    <div
      className={mx('tlui-style-panel', !isMobile && 'tlui-style-panel__wrapper')}
      data-ismobile={isMobile}
      onPointerLeave={handlePointerLeave}
    >
      {/* <CommonStylePickerSet theme={theme} styles={styles} /> */}
      {/* {!hideText && <TextStylePickerSet theme={theme} styles={styles} />} */}
      <DefaultStylePanelContent styles={styles} />
    </div>
  );
});
