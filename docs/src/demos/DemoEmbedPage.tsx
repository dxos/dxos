//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { StoryDemo } from './StoryDemo.tsx';

/** The demo named by `?id=`, for `pages/embed/demo.astro`, with peers of its own. */
export const DemoEmbedPage = () => {
  const id = new URLSearchParams(window.location.search).get('id') ?? '';
  return <StoryDemo id={id} standalone />;
};
