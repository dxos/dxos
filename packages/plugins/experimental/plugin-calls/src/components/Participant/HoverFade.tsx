//
// Copyright 2025 DXOS.org
//

import React, { type FC, type ReactNode, useEffect, useState } from 'react';

import { mx } from '@dxos/react-ui-theme';

interface HoverFadeProps {
  timeout?: number;
  className?: string;
  children?: ReactNode;
}

export const HoverFade: FC<HoverFadeProps> = ({ timeout = 2000, children, className }) => {
  const [activity, setActivity] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const mounted = true;
    if (visible) {
      const t = setTimeout(() => {
        if (mounted) {
          setVisible(false);
        }
      }, timeout);

      return () => {
        clearTimeout(t);
      };
    }
    // include activity to reset timeout when new activity is recorded
  }, [timeout, visible, activity]);

  return (
    <div
      className={mx(!visible && 'inactive opacity-0', className)}
      // visible={visible}
      onPointerLeave={() => {
        setVisible(false);
      }}
      onPointerMove={() => {
        setVisible(true);
        setActivity(Date.now());
      }}
    >
      {children}
    </div>
  );
};
