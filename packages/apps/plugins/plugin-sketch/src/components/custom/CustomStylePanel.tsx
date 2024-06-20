//
// Copyright 2024 DXOS.org
//

import { useEditor } from '@tldraw/editor';
import { DefaultStylePanelContent, type TLUiStylePanelProps, useRelevantStyles } from '@tldraw/tldraw';
import React, { memo, useCallback } from 'react';

import { mx } from '@dxos/react-ui-theme';

export const CustomStylePanel = memo(({ isMobile }: TLUiStylePanelProps) => {
  const editor = useEditor();
  const styles = useRelevantStyles();

  const handlePointerLeave = useCallback(() => {
    if (!isMobile) {
      editor.updateInstanceState({ isChangingStyle: false });
    }
  }, [editor, isMobile]);

  // TODO(burdon): Currently the global STYLES (fonts, colors, etc.) are not pluggable.
  // TODO(burdon): Implement custom style panel to replace fonts.
  // https://github.com/tldraw/tldraw/blob/main/apps/examples/src/examples/custom-style-panel/CustomStylePanelExample.tsx
  return (
    <div
      className={mx('tlui-style-panel', !isMobile && 'tlui-style-panel__wrapper')}
      data-ismobile={isMobile}
      onPointerLeave={handlePointerLeave}
    >
      <DefaultStylePanelContent styles={styles} />
    </div>
  );
});
