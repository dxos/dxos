//
// Copyright 2023 DXOS.org
//

import type { IconProps } from '@phosphor-icons/react';
import type { FC } from 'react';

import type { MaybePromise } from '@dxos/util';

// TODO(thure): `Parameters<TFunction>` causes typechecking issues because `TFunction` has so many signatures.
export type Label = string | [string, { ns: string; count?: number }];

/**
 * An action on a node in the graph which may be invoked by sending the associated intent.
 */
export type Action<TProperties extends Record<string, any> = Record<string, any>> = {
  /**
   * Locally unique ID.
   */
  id: string;

  /**
   * Label to be used when displaying the node.
   * For default labels, use a translated string.
   *
   * @example 'Test Action'
   * @example ['test action label, { ns: 'example-plugin' }]
   */
  label: Label;

  /**
   * Icon to be used when displaying the node.
   */
  icon?: FC<IconProps>;

  /**
   * Key binding.
   * NOTE: Alphanumeric characters should be declared in lowercase.
   */
  keyBinding?: string;

  /**
   * Properties of the node relevant to displaying the action.
   *
   * @example { index: 'a1' }
   */
  properties: TProperties;

  /**
   * Sub-actions of the node stored by their id.
   */
  actionsMap: Record<string, Action>;

  /**
   * Actions of the node in default order.
   */
  // TODO(burdon): Why get vs. prop?
  get actions(): Action[];

  invoke: () => MaybePromise<any>;

  addProperty(key: string, value: any): void;
  removeProperty(key: string): void;

  addAction<TActionProperties extends Record<string, any> = Record<string, any>>(
    ...action: (Pick<Action, 'id' | 'label' | 'invoke'> & Partial<Action<TActionProperties>>)[]
  ): Action<TActionProperties>[];
  removeAction(id: string): Action;
};
