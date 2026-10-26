//
// Copyright 2026 DXOS.org
//

/**
 * Splits an mbox file, as Python's `mailbox.mbox` writes it, into raw RFC 5322 messages.
 *
 * Each message starts with a `From ` separator line, and a body line that began with `From ` was
 * written as `>From `; both are undone here, so a message round-trips to what step 01 built.
 */
export const splitMbox = (text: string): string[] => {
  const normalized = text.replace(/\r\n/g, '\n');
  const starts = [...normalized.matchAll(/^From .*$/gm)]
    .filter((match) => match.index === 0 || normalized[(match.index ?? 0) - 1] === '\n')
    .map((match) => match.index ?? 0);
  return starts.map((start, index) => {
    const end = index + 1 < starts.length ? starts[index + 1] : normalized.length;
    const block = normalized.slice(start, end);
    const message = block.slice(block.indexOf('\n') + 1).replace(/\n+$/, '\n');
    return message.replace(/^>From /gm, 'From ');
  });
};

/** Writes raw messages as an mbox that `splitMbox` reads back, with LF line ends and `From ` body lines escaped. */
export const joinMbox = (messages: readonly string[]): string =>
  messages
    .map((message) => {
      const escaped = message
        .replace(/\r\n/g, '\n')
        .replace(/^From /gm, '>From ')
        .replace(/\n*$/, '\n');
      return `From MAILER-DAEMON Thu Jan  1 00:00:00 1970\n${escaped}`;
    })
    .join('\n');
