//
// Copyright 2026 DXOS.org
//

/** An input device, as `enumerateDevices` lists it. */
export type InputDevice = { deviceId: string; label: string };

/** A studio microphone, preferred over the built-in one when nothing is chosen. */
export const PREFERRED_MICROPHONE = /shure/i;

/**
 * The device to record from: the chosen one while it is connected, else the first whose label matches `preferred`,
 * else the first listed. Undefined when there are none.
 */
export const pickDevice = (
  devices: readonly InputDevice[],
  selected?: string,
  preferred?: RegExp,
): string | undefined =>
  (selected && devices.some((device) => device.deviceId === selected) ? selected : undefined) ??
  (preferred && devices.find((device) => preferred.test(device.label))?.deviceId) ??
  devices[0]?.deviceId;

/** Microphone constraints for a voice-over: the raw signal, since processing pumps the level and colours the voice. */
export const audioConstraints = (deviceId?: string): MediaTrackConstraints => ({
  ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
});
