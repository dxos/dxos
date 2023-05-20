//
// Copyright 2023 DXOS.org
//

export enum IntentAction {
  SPACE_SELECT,
  SPACE_SHARE,
}

/**
 * Experimental event for loosely coupled interaction.
 * Inspired by: https://developer.android.com/reference/android/content/Intent
 */
export type Intent<T = {}, A = IntentAction> = {
  action: A;
  source?: string;
  data: T;
};
