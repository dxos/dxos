//
// Copyright 2023 DXOS.org
//
import React from 'react';

import { definePlugin } from '../framework';

const Image = (props: { data: { src: string }}) => <img src={props.data.src} />;

export const ImagePlugin = definePlugin({
  meta: {
    id: 'com.dxos.image'
  },
  provides: {
    component: (d) => d?.src ? Image : null;
  }
});
