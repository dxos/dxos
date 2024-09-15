//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { useRive } from '@rive-app/react-canvas';
import React, { useEffect } from 'react';

import { useAsyncCallback } from '@dxos/react-ui';
import { withFullscreen, withTheme } from '@dxos/storybook-utils';

export default {
  title: 'brand/experimental',
  decorators: [withTheme, withFullscreen()],
};

const Component = ({ buffer }: { buffer: ArrayBuffer }) => {
  // https://rive.app/community/doc/rive-parameters/docHI9ASztXP
  const { rive, RiveComponent } = useRive({ buffer, autoplay: false });
  useEffect(() => {
    const t = setInterval(() => {
      rive?.play('flash-2');
    }, 2_000);

    return () => clearTimeout(t);
  }, [rive]);

  return (
    <div className='relative flex w-full bg-black'>
      <RiveComponent />
      <div className='absolute inset-0' style={{ background: 'radial-gradient(transparent 10%, black)' }} />
    </div>
  );
};

export const Default = () => {
  const buffer = useAsyncCallback<ArrayBuffer | undefined>(async () => {
    // TODO(burdon): CORS allowed via dashboard.
    const response = await fetch('https://dxos.network/dxos.riv', { mode: 'cors' });
    if (response.ok) {
      return await response.arrayBuffer();
    } else {
      console.log(response.status);
    }
  });

  if (!buffer) {
    return null;
  }

  return <Component buffer={buffer} />;
};
