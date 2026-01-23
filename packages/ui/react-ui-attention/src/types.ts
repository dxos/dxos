//
// Copyright 2025 DXOS.org
//

// NOTE: Chosen from RFC 1738's `safe` characters: http://www.faqs.org/rfcs/rfc1738.html
export const ATTENDABLE_PATH_SEPARATOR = '~';

export type Attention = {
  hasAttention: boolean;
  isAncestor: boolean;
  isRelated: boolean;
};

export type CurrentState = {
  current: string[];
};
