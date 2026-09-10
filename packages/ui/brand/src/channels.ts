//
// Copyright 2026 DXOS.org
//

/**
 * The prerelease channels, by the environment name a deploy sets. Each installs and runs beside the
 * released app, so each carries its own colour of the mark; production is the released app and is not
 * a channel.
 */
export type Channel = 'dev' | 'preview' | 'staging';

export const CHANNELS: readonly Channel[] = ['dev', 'preview', 'staging'];

export const isChannel = (value: string): value is Channel => CHANNELS.some((channel) => channel === value);

/** Hue of the released mark's four-colour ramp (`rgb(1 122 183)` and its steps), in degrees. */
export const RAMP_HUE = 200;

export type ChannelColor = {
  /** Replaces the ramp's hue, in degrees. */
  hue: number;
  /** Scales the ramp's saturation. */
  saturation: number;
  /** Scales the ramp's lightness, so the four steps stay proportional to one another. */
  lightness: number;
};

/**
 * Each channel's colour. Preview is the channel people run beside production, so it gets the hue that
 * reads least like the released blue; the others share a rust, since telling them apart from each other
 * matters less than telling any of them apart from the app holding real data. Rust is held below the
 * ramp's near-full saturation: at full it reads as a warning colour and competes with the app's own
 * error states.
 */
export const CHANNEL_COLORS: Record<Channel, ChannelColor> = {
  preview: { hue: 282, saturation: 1, lightness: 1 },
  dev: { hue: 20, saturation: 0.75, lightness: 1 },
  staging: { hue: 20, saturation: 0.75, lightness: 1 },
};

/**
 * The CSS filter that turns the released mark into the channel's. An SVG needs no generated copy to
 * change colour: whoever renders the mark applies this over it.
 */
export const channelMarkFilter = (channel: Channel): string => {
  const { hue, saturation } = CHANNEL_COLORS[channel];
  const rotate = (((hue - RAMP_HUE) % 360) + 360) % 360;
  return [`hue-rotate(${rotate}deg)`, saturation !== 1 && `saturate(${saturation})`].filter(Boolean).join(' ');
};
