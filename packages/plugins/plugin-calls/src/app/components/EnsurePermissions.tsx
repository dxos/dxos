//
// Copyright 2024 DXOS.org
//

import React, { useRef, useState, type ReactNode } from 'react';

import { useAsyncEffect } from '@dxos/react-ui';

import { Button } from './Button';

export interface EnsurePermissionsProps {
  children?: ReactNode;
}

type PermissionState = 'denied' | 'granted' | 'prompt' | 'unable-to-determine';

const getExistingPermissionState = async (): Promise<PermissionState> => {
  try {
    const query = await navigator.permissions.query({
      name: 'microphone' as any,
    });
    return query.state;
  } catch (error) {
    return 'unable-to-determine';
  }
};

export const EnsurePermissions = (props: EnsurePermissionsProps) => {
  const [permissionState, setPermissionState] = useState<PermissionState | null>(null);

  const mountedRef = useRef(true);

  useAsyncEffect(async () => {
    if (mountedRef.current) {
      setPermissionState(await getExistingPermissionState());
    }
    return () => {
      mountedRef.current = false;
    };
  }, [mountedRef.current]);

  if (permissionState === null) {
    return null;
  }

  if (permissionState === 'denied') {
    return (
      <div className='grid items-center h-full'>
        <div className='mx-auto space-y-2 max-w-80'>
          <h1 className='text-2xl font-bold'>Permission denied</h1>
          <p>You will need to go into your browser settings and manually re-enable permission.</p>
        </div>
      </div>
    );
  }

  if (permissionState === 'prompt') {
    return (
      <div className='grid items-center h-full'>
        <div className='mx-auto max-w-80'>
          <p className='mb-8'>
            In order to use Orange Meets, you will need to grant permission to your camera and microphone. You will be
            prompted for access.
          </p>
          <Button
            onClick={() => {
              navigator.mediaDevices
                .getUserMedia({
                  video: true,
                  audio: true,
                })
                .then((ms) => {
                  if (mountedRef.current) {
                    setPermissionState('granted');
                  }
                  ms.getTracks().forEach((t) => t.stop());
                })
                .catch(() => {
                  if (mountedRef.current) {
                    setPermissionState('denied');
                  }
                });
            }}
          >
            Allow access
          </Button>
        </div>
      </div>
    );
  }

  return props.children;
};
