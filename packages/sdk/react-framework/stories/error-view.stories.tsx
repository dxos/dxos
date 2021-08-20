//
// Copyright 2021 DXOS.org
//

import React from 'react';

import ErrorView from '../src/components/ErrorView';

export const ErrorViewStory = () => {
  const testError = new Error('Error CODE');

  return (
    <ErrorView error={testError} onRestart={() => {}} />
  );
};

export default {
  title: 'ErrorView Component',
  component: ErrorViewStory
};
