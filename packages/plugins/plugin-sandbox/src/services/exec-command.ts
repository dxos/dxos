//
// Copyright 2026 DXOS.org
//

/**
 * The command as the sandbox service can run it. The service loses the newlines of a multi-line
 * command on the way to the shell, so a heredoc or a script block reaches it as one line: `cat`
 * then waits on stdin until the timeout, and the stuck process holds every later exec on that
 * sandbox. A multi-line command therefore travels as base64, one line with no quoting, and is
 * decoded into a file the shell runs; a single-line command is sent as it is.
 *
 * Each script gets a file of its own: a background command is still reading its script when the next
 * one arrives, and bash reads a script as it runs it.
 */
export const encodeExecCommand = (command: string, scriptId: string = crypto.randomUUID()): string => {
  if (!command.includes('\n')) {
    return command;
  }
  const encoded = Buffer.from(command, 'utf8').toString('base64');
  const script = `/tmp/.dx-exec-${scriptId}.sh`;
  return `printf '%s' '${encoded}' | base64 -d > ${script} && bash ${script}`;
};
