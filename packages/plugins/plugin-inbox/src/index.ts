//
// Copyright 2023 DXOS.org
//

export * from './skills';
export * from './meta';
export * from './types';

// Sentinel `subject` for the mailbox facts companion surface; exported so a surface can be rendered
// directly (bypassing the app graph) with the same data contract the graph builder produces.
export { MAILBOX_FACTS_NODE_DATA } from './constants';

// TODO(burdon): Remove export! Pass range via operation.
export { getCalendarRangeSelectionId } from './paths';
