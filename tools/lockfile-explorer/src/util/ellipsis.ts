//
// Copyright 2025 DXOS.org
//

export const ellipsis = (text: string, length: number) => (text.length > length ? text.slice(0, length) + '...' : text);
