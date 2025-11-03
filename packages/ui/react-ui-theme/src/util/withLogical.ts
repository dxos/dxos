//
// Copyright 2022 DXOS.org
//

// This tailwind-merge plugin is based upon https://github.com/vltansky/tailwind-merge-logical-plugin

import { type Config, mergeConfigs, validators } from 'tailwind-merge';

const getLength = () => [validators.isLength, validators.isArbitraryLength] as const;
const getLengthWithAuto = () => ['auto', validators.isLength, validators.isArbitraryLength] as const;
const getLengthWithEmpty = () => ['', validators.isLength, validators.isArbitraryLength] as const;
const getAny = () => [validators.isAny] as const;
const getRounded = () => ['none', '', validators.isTshirtSize, 'full', validators.isArbitraryLength] as const;

const classGroupsConfig = {
  float: [{ float: ['start', 'end'] }],
  clear: [{ clear: ['start', 'end'] }],
  resize: [{ resize: ['block ', 'inline'] }],
  'text-alignment': [{ text: ['start', 'end'] }],
  'logical.overscroll-b': [{ 'overscroll-b': ['auto ', 'contain', 'auto'] }],
  'logical.overscroll-i': [{ 'overscroll-b': ['auto ', 'contain', 'auto'] }],
  'logical.bs': [{ bs: getLength() }],
  'logical.min-bs': [{ 'min-bs': getAny() }],
  'logical.max-bs': [{ 'max-bs': getAny() }],
  'logical.is': [{ is: getLength() }],
  'logical.min-is': [{ 'min-is': getAny() }],
  'logical.max-is': [{ 'max-is': getAny() }],
  'logical.mlb': [{ mlb: getAny() }],
  'logical.mli': [{ mli: getAny() }],
  'logical.mbs': [{ mbs: getAny() }],
  'logical.mbe': [{ mbe: getAny() }],
  'logical.mis': [{ mis: getAny() }],
  'logical.mie': [{ mie: getAny() }],
  'logical.plb': [{ plb: getAny() }],
  'logical.pli': [{ pli: getAny() }],
  'logical.pbs': [{ pbs: getAny() }],
  'logical.pbe': [{ pbe: getAny() }],
  'logical.pis': [{ pis: getAny() }],
  'logical.pie': [{ pie: getAny() }],
  'logical.space-b': [{ 'space-b': getLength() }],
  'logical.space-i': [{ 'space-i': getLength() }],
  'logical.inset-block': [{ 'inset-block': getLengthWithAuto() }],
  'logical.inset-inline': [{ 'inset-inline': getLengthWithAuto() }],
  'logical.block-start': [{ 'block-start': getLengthWithAuto() }],
  'logical.block-end': [{ 'block-end': getLengthWithAuto() }],
  'logical.inline-start': [{ 'inline-start': getLengthWithAuto() }],
  'logical.inline-end': [{ 'inline-end': getLengthWithAuto() }],
  'logical.border-li': [{ 'border-li': getLengthWithEmpty() }],
  'logical.border-lb': [{ 'border-lb': getLengthWithEmpty() }],
  'logical.border-bs': [{ 'border-bs': getLengthWithEmpty() }],
  'logical.border-be': [{ 'border-be': getLengthWithEmpty() }],
  'logical.border-is': [{ 'border-is': getLengthWithEmpty() }],
  'logical.border-ie': [{ 'border-ie': getLengthWithEmpty() }],
  'logical.border-color-bs': [{ 'border-bs': getAny() }],
  'logical.border-color-be': [{ 'border-be': getAny() }],
  'logical.border-color-is': [{ 'border-is': getAny() }],
  'logical.border-color-ie': [{ 'border-ie': getAny() }],
  'logical.rounded-bs': [{ 'rounded-bs': getRounded() }],
  'logical.rounded-be': [{ 'rounded-be': getRounded() }],
  'logical.rounded-is': [{ 'rounded-is': getRounded() }],
  'logical.rounded-ie': [{ 'rounded-ie': getRounded() }],
  'logical.rounded-ss': [{ 'rounded-ss': getRounded() }],
  'logical.rounded-se': [{ 'rounded-se': getRounded() }],
  'logical.rounded-es': [{ 'rounded-es': getRounded() }],
  'logical.rounded-ee': [{ 'rounded-ee': getRounded() }],
  'logical.divide-b': [{ 'divide-b': getLengthWithEmpty() }],
  'logical.divide-i': [{ 'divide-i': getLengthWithEmpty() }],
};

export type WithLogicalClassGroups = keyof typeof classGroupsConfig;

type WithLogicalConfig = Config<WithLogicalClassGroups, string>;

export const withLogical = (prevConfig: WithLogicalConfig): WithLogicalConfig =>
  mergeConfigs(prevConfig, {
    extend: {
      classGroups: classGroupsConfig,
      conflictingClassGroups: {
        'inset-block': ['logical.block-start', 'logical.block-end'],
        'inset-inline': ['logical.inline-start', 'logical.inline-end'],
        p: ['logical.plb', 'logical.pli', 'logical.pbs', 'logical.pbe', 'logical.pis', 'logical.pie'],
        pli: ['logical.pis', 'logical.pie'],
        plb: ['logical.pbs', 'logical.pbe'],
        m: ['logical.mlb', 'logical.mli', 'logical.mbs', 'logical.mbe', 'logical.mis', 'logical.mie'],
        mli: ['logical.mis', 'logical.mie'],
        mlb: ['logical.mbs', 'logical.mbe'],
        overscroll: ['overscroll-i', 'overscroll-b'],
        rounded: [
          'logical.rounded-bs',
          'logical.rounded-be',
          'logical.rounded-is',
          'logical.rounded-ie',
          'logical.rounded-ss',
          'logical.rounded-se',
          'logical.rounded-es',
          'logical.rounded-ee',
        ],
        'logical.rounded-bs': ['logical.rounded-ss', 'logical.rounded-se'],
        'logical.rounded-be': ['logical.rounded-es', 'logical.rounded-ee'],
        'logical.rounded-is': ['logical.rounded-ss', 'logical.rounded-es'],
        'logical.rounded-ie': ['logical.rounded-ee', 'logical.rounded-se'],
        'logical.border-li': ['logical.border-is', 'logical.border-ie'],
        'logical.border-lb': ['logical.border-bs', 'logical.border-be'],
        'border-color': [
          'logical.border-color-bs',
          'logical.border-color-be',
          'logical.border-color-is',
          'logical.border-color-ie',
        ],
        border: ['logical.border-bs', 'logical.border-be', 'logical.border-is', 'logical.border-ie'],
      },
    },
  });
