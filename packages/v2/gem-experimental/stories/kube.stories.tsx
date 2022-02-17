//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Kube } from '../src';

export default {
  title: 'experimental/kube'
};

export const Primary = () => {
  return (
    <div>
      <Kube
        config={{
          particleCount: 200,
          maxParticleCount: 300
        }}
      />
    </div>
  );
};
