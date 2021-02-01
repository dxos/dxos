//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';
import useResizeAware from 'react-resize-aware';

import { Kube } from '../src';

export default {
  title: 'KUBE'
};

export const Primary = () => {
  const [resizeListener, size] = useResizeAware();
  const container = useRef(null);
  const [kube, setKube] = useState(null);

  useEffect(() => {
    const kube = new Kube({
      radius: 800,
      maxParticleCount: 600,
      particleCount: 400,
      minDistance: 150,
      maxConnections: 20,
      showLines: true,
      limitConnections: false
    });

    // TODO(burdon): Deregister.
    kube.init(container.current).animate();

    setKube(kube);
  }, []);

  useEffect(() => {
    if (kube) {
      kube.setSize(size.width, size.height);
    }
  }, [kube, size])

  return (
    <div>
      {resizeListener}
      <div ref={container} />
    </div>
  );
};
