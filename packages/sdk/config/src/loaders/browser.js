//
// Copyright 2020 DXOS.
//

/* THIS FILE WILL BE LOADED BY CONTEXT REPLACEMENT PLUGIN IN BROWSER ENVS */

/* global __DXOS_CONFIG__ __CONFIG_DYNAMICS__ __CONFIG_ENVS__ __CONFIG_DEFAULTS__ */

const CONFIG_ENDPOINT = '/config/config.json';

export const LocalStorage = (item = 'options') => {
  return JSON.parse(window.localStorage.getItem(item) || '{}');
};

export const Dynamics = async () => {
  const { publicUrl = '', dynamic } = __DXOS_CONFIG__;
  return !dynamic ? __CONFIG_DYNAMICS__ : (await fetch(`${publicUrl}${CONFIG_ENDPOINT}`)).json();
};

export const Envs = () => {
  return __CONFIG_ENVS__;
};

export const Defaults = () => {
  return __CONFIG_DEFAULTS__;
};
