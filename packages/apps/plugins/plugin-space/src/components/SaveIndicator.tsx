//
// Copyright 2023 DXOS.org
//

import { Warning } from '@phosphor-icons/react';
import React, { useEffect, useState } from 'react';

import { findPlugin, usePlugins } from '@dxos/app-framework';
import { log } from '@dxos/log';

import { type SpacePluginProvides } from '../types';

export type SaveIndicatorProps = {
  hideSaveIndicator?: boolean;
  saveIndicatorDelay?: number;
  clearStatusAfter?: number;
};

export const SaveIndicator = ({
  hideSaveIndicator = false,
  saveIndicatorDelay = 250,
  clearStatusAfter = 1000,
}: SaveIndicatorProps) => {
  // TODO(dmaretskyi): useReducer.
  const [batchCount, setBatchCount] = useState(0);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [minThresholdReached, setMinThresholdReached] = useState(true);
  const [maxThresholdReached, setMaxThresholdReached] = useState(true);
  const { plugins } = usePlugins();
  const spacePlugin = findPlugin<SpacePluginProvides>(plugins, 'dxos.org/plugin/space');
  const space = spacePlugin?.provides.space.active;
  useEffect(() => {
    if (!space) {
      return;
    }

    let clear = () => {};

    const unsubscribe = space.db.pendingBatch.on(({ size, error }) => {
      setBatchCount(size ?? 0);
      setError(error);
      if (error) {
        log.catch(error);
      }
      setMinThresholdReached(false);
      setMaxThresholdReached(false);
      clear();

      const t1 = setTimeout(() => {
        setMinThresholdReached(true);
      }, saveIndicatorDelay);

      const t2 = setTimeout(() => {
        setMaxThresholdReached(true);
      }, clearStatusAfter);

      clear = () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    });

    return () => {
      unsubscribe();
      clear();
    };
  }, [space]);

  if (error) {
    return (
      <div className='inline-flex items-baseline text-gray-400 mx-1 h-5 text-orange-400'>
        <Warning className='self-center w-5' />
        <span>Error saving changes</span>
      </div>
    );
  }

  if (batchCount > 0 && minThresholdReached && !hideSaveIndicator) {
    return (
      <div className='inline-flex items-baseline text-gray-400 mx-1 h-5'>
        <div className='self-center w-5'>
          <SaveIcon />
        </div>
        <span className='self-center'>Saving...</span>
      </div>
    );
  }

  if (batchCount === 0 && !maxThresholdReached && !hideSaveIndicator) {
    return (
      <div className='inline-flex items-baseline text-gray-400 mx-1 h-5'>
        <span>All changes saved</span>
      </div>
    );
  }

  return null;
};

const SaveIcon = () => (
  <svg className='w-5 h-5 rounded-full animate-spin' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
    <path d='M12 4.75V6.25' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'></path>
    <path
      d='M17.1266 6.87347L16.0659 7.93413'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    ></path>
    <path
      d='M19.25 12L17.75 12'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    ></path>
    <path
      d='M17.1266 17.1265L16.0659 16.0659'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    ></path>
    <path
      d='M12 17.75V19.25'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    ></path>
    <path
      d='M7.9342 16.0659L6.87354 17.1265'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    ></path>
    <path
      d='M6.25 12L4.75 12'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    ></path>
    <path
      d='M7.9342 7.93413L6.87354 6.87347'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    ></path>
  </svg>
);
