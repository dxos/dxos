//
// Copyright 2021 DXOS.org
//

export const rtf = new Intl.RelativeTimeFormat('en', { style: 'narrow' });

export const rt = (since: number, now: number) => {
  const seconds = Math.round((now - since) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);
  if (Math.abs(days) > 1) {
    return rtf.format(days, 'days');
  }
  if (Math.abs(hours) > 1) {
    return rtf.format(hours, 'hours');
  }
  if (Math.abs(minutes) > 1) {
    return rtf.format(minutes, 'minutes');
  }

  return rtf.format(seconds, 'seconds');
};
