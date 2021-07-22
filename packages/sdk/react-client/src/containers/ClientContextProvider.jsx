//
// Copyright 2020 DXOS.org
//

import leveljs from 'level-js';
import memdown from 'memdown';
import pify from 'pify';
import React, { useEffect, useState } from 'react';

import { createClient } from '@dxos/client';
import { Keyring, KeyStore } from '@dxos/credentials';
import { logs } from '@dxos/debug';
import metrics from '@dxos/metrics';
import { createStorage } from '@dxos/random-access-multi-storage';

import { ClientContext } from '../hooks';

const { error } = logs('react-client:Provider');

/**
 * @deprecated Use `ClientProvider` or `ClientInitializer` from @dxos/react-appkit.
 * Feed provider container.
 */
const ClientContextProvider = ({ config, children }) => {
  console.warn('ClientContextProvider is being deprecated. Use `ClientProvider` or `ClientInitializer` from @dxos/react-appkit.');

  const { client: clientConfig } = config;

  const [client, setClient] = useState(null);
  const [reset, setReset] = useState(null);
  const [initError, setInitError] = useState(false);

  //
  // https://reactjs.org/docs/hooks-effect.html
  // Runs this effect when the component first mounts and when `config` changes.
  // Uses a runEffect async method since useEffect cannot receive an async callback
  //

  useEffect(() => {
    let mounted = true;

    const runEffect = async () => {
      if (mounted) {
        const timer = metrics.start('ClientContext.init');

        let feedStorage;
        let keyStorage;

        // Set up the reset handler before attempting any complex initialization.
        setReset({
          reset: async () => {
            if (feedStorage) {
              try {
                console.log('Resetting feeds...');
                await feedStorage.destroy();
              } catch (err) {
                error(err);
              }
            }

            if (keyStorage) {
              try {
                console.log('Resetting keys...');
                await pify(keyStorage.clear.bind(keyStorage))();
              } catch (err) {
                error(err);
              }
            }
          }
        });

        try {
          feedStorage = createStorage(clientConfig.feedStorage.root, clientConfig.feedStorage.type);
          keyStorage = clientConfig.keyStorage.type === 'memory'
            ? memdown()
            : leveljs(`${clientConfig.keyStorage.root}/keystore`);

          const keyring = new Keyring(new KeyStore(keyStorage));
          await keyring.load();

          const client = await createClient(feedStorage, keyring, clientConfig);

          metrics.set('storage.root', feedStorage.root);
          metrics.set('storage.type', feedStorage.type);
          metrics.set('keyring.storage.root', clientConfig.keyStorage.root);
          metrics.set('keyring.storage.type', clientConfig.keyStorage.type);

          // Console access.
          if (config.debug.mode === 'development' || clientConfig.devtools) {
            window.__DXOS__ = client.getDevtoolsContext();
          }

          setClient(client);
        } catch (err) {
          setInitError(err);
        }

        timer.end();
      }
    };

    // TODO(burdon): Propagate errors?
    runEffect().then(() => null, error);

    return () => {
      mounted = false;
    };
  }, [config]);

  return (
    <>
      {(client || initError) && (
        <ClientContext.Provider value={{ config, client, reset, initError }}>
          {children}
        </ClientContext.Provider>
      )}
    </>
  );
};

export default ClientContextProvider;
