//
// Copyright 2026 DXOS.org
//

/**
 * The command as the sandbox service can run it. The service loses the newlines of a multi-line
 * command on the way to the shell, so a heredoc or a script block reaches it as one line: `cat`
 * then waits on stdin until the timeout, and the stuck process holds every later exec on that
 * sandbox. A multi-line command therefore travels as base64, one line with no quoting, and is
 * decoded into a file the shell runs; a single-line command is sent as it is.
 */
export const encodeExecCommand = (command: string): string => {
  if (!command.includes('\n')) {
    return command;
  }
  const encoded = Buffer.from(command, 'utf8').toString('base64');
  return `printf '%s' '${encoded}' | base64 -d > /tmp/.dx-exec.sh && bash /tmp/.dx-exec.sh`;
};
