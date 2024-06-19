//
// Copyright 2024 DXOS.org
//

import { useEditor } from '@tldraw/editor';
import { DefaultStylePanelContent, type TLUiStylePanelProps, useRelevantStyles } from '@tldraw/tldraw';
import React, { memo, useCallback } from 'react';

import { mx } from '@dxos/react-ui-theme';

export const CustomStylePanel = memo(({ isMobile, children }: TLUiStylePanelProps) => {
  const editor = useEditor();

  const styles = useRelevantStyles();

  const handlePointerOut = useCallback(() => {
    if (!isMobile) {
      editor.updateInstanceState({ isChangingStyle: false });
    }
  }, [editor, isMobile]);

  const content = children ?? <DefaultStylePanelContent styles={styles} />;

  // TODO(burdon): Currently the global STYLES (fonts, colors, etc.) isn't pluggable.
  return (
    <div
      className={mx('tlui-style-panel', !isMobile && 'tlui-style-panel__wrapper')}
      data-ismobile={isMobile}
      onPointerLeave={handlePointerOut}
    >
      {content}
    </div>
  );
});
