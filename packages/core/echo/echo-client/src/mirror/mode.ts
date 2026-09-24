//
// Copyright 2026 DXOS.org
//

/**
 * Whether objects not yet added to a database keep JSON documents instead of Automerge ones. Set
 * process-wide because an object is created before anyone knows which database it will join; a
 * tab without Automerge sets it once at startup.
 */
let mirrorMode = false;

export const isMirrorMode = (): boolean => mirrorMode;

export const setMirrorMode = (enabled: boolean): void => {
  mirrorMode = enabled;
};

/**
 * Whether a mirror tab reads object documents from the worker's index, so the worker need not load
 * them, and switches a document to the worker's Automerge copy on its first write.
 */
let indexedReads = false;

export const isMirrorIndexedReads = (): boolean => indexedReads;

export const setMirrorIndexedReads = (enabled: boolean): void => {
  indexedReads = enabled;
};
