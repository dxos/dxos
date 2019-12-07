//
// Copyright 2019 Wireline, Inc.
//

export const sortByProperty = property => ({ [property]: a }, { [property]: b }) => (a > b ? 1 : a < b ? -1 : 0);
