//
// Copyright 2023 DXOS.org
//

const SEPARATOR = ':';

export const parseDndId = (id: string) => id.split(SEPARATOR);
export const getDndId = (...parts: string[]) => parts.join(SEPARATOR);
