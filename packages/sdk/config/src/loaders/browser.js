//
// Copyright 2021 DXOS.org
//

/* THIS FILE WILL BE LOADED BY CONTEXT REPLACEMENT PLUGIN IN BROWSER ENVS. */

/* global __DXOS_CONFIG__ __CONFIG_DYNAMICS__ __CONFIG_ENVS__ __CONFIG_DEFAULTS__ */

const CONFIG_ENDPOINT = '/.well-known/dx/config';

export const LocalStorage = (item = 'options') => JSON.parse(window.localStorage.getItem(item) || '{}');

export const Dynamics = async () => {
  const { publicUrl = '', dynamic } = __DXOS_CONFIG__;
  return dynamic
    ? await fetch(`${publicUrl}${CONFIG_ENDPOINT}`)
        .then((res) => res.json())
        .catch((error) => {
          console.warn('Failed to fetch dynamic config.', error);
          return __CONFIG_DYNAMICS__;
        })
    : __CONFIG_DYNAMICS__;
};

export const Envs = () => __CONFIG_ENVS__;

export const Defaults = () => __CONFIG_DEFAULTS__;
