//
// Copyright 2026 DXOS.org
//

//
// A theme picked in this view alone, for a host that stores no theme choice: the theme is a way of viewing, so the
// picker works in every scene, read-only ones included, and a host that keeps no choice still lets the viewer pick.
//

/** A theme picked here; `theme` unset is the default, picked over a theme the host gave. */
export type ThemeChoice = { readonly theme: string | undefined };

/** The theme drawn: the one picked here when there is one, otherwise the host's. */
export const chooseTheme = (host: string | undefined, choice: ThemeChoice | undefined): string | undefined =>
  choice ? choice.theme : host;

/** An editor display with a theme picked here over the host's: the pick shows as the override, as a host's would. */
export const withThemeChoice = <D extends { theme: string; themeOverride?: string }>(
  display: D,
  choice: ThemeChoice | undefined,
): D => (choice ? { ...display, theme: choice.theme ?? display.theme, themeOverride: choice.theme } : display);
