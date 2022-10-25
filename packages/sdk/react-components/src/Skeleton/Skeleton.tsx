//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState } from 'react';

import {
  Box,
  Fade,
  Skeleton as MuiSkeleton,
  SkeletonProps as MuiSkeletonProps
} from '@mui/material';

import { useMounted } from '@dxos/react-async';

export interface SkeletonProps extends MuiSkeletonProps {
  delay?: number;
}

export const Skeleton = ({ delay = 500, ...props }: SkeletonProps) => {
  const [show, setShow] = useState(false);
  const isMounted = useMounted();

  useEffect(() => {
    setTimeout(() => {
      if (isMounted()) {
        setShow(true);
      }
    }, delay);
  }, []);

  return (
    <Fade in={show} timeout={500}>
      <Box>
        <MuiSkeleton {...props} />
      </Box>
    </Fade>
  );
};
