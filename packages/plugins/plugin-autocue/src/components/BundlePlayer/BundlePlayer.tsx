//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import React, { useEffect, useState } from 'react';

import { type Manifest, Player, loadBundle } from '@dxos/autocue/player';
import * as Layout from '@dxos/react-ui/Layout';
import { useTranslation } from '@dxos/react-ui/Theme';

import { AutocueNamespace } from '../../namespace.ts';

type BundleState = { status: 'loading' } | { status: 'ready'; manifest: Manifest } | { status: 'error'; error: string };

export type BundlePlayerProps = {
  /** The bundle folder, its `index.html`, or its `autocue.json`. */
  url?: string;
};

/** Fetches the autocue bundle at `url` and plays it, filling its container. */
export const BundlePlayer = ({ url }: BundlePlayerProps) => {
  const { t } = useTranslation(AutocueNamespace.key);
  const [state, setState] = useState<BundleState>({ status: 'loading' });

  useEffect(() => {
    if (!url) {
      return;
    }
    setState({ status: 'loading' });
    const fiber = Effect.runFork(
      loadBundle(url).pipe(
        Effect.match({
          onFailure: (error) => setState({ status: 'error', error: error.message }),
          onSuccess: (manifest) => setState({ status: 'ready', manifest }),
        }),
      ),
    );
    return () => {
      void Effect.runFork(Fiber.interrupt(fiber));
    };
  }, [url]);

  if (!url) {
    return <Message>{t('no-url.message')}</Message>;
  }

  switch (state.status) {
    case 'loading':
      return <Message>{t('loading.message')}</Message>;
    case 'error':
      return <Message>{t('load-error.message', { error: state.error })}</Message>;
    case 'ready':
      return <Player manifest={state.manifest} layout='embedded' />;
  }
};

const Message = ({ children }: { children: string }) => (
  <Layout.Flex center classNames='h-full p-4 text-center text-fg-muted' role='status'>
    {children}
  </Layout.Flex>
);
