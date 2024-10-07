//
// Copyright 2024 DXOS.org
//

export default <T extends object>(obj: T, key: keyof any): key is keyof T => key in obj;
