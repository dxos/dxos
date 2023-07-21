//
// Copyright 2023 DXOS.org
//

declare module 'forever' {
  export type Config = {
    root: string;
  };

  export const load: (config: Config) => void;

  export type MonitorOptions = {
    //
    // Basic configuration options
    //
    silent?: boolean | undefined; // Silences the output from stdout and stderr in the parent process
    uid?: string | undefined; // Custom uid for this forever process. (default: autogen)
    pidFile?: string | undefined; // Path to put pid information for the process(es) started
    max?: number | undefined; // Sets the maximum number of times a given script should run
    killTree?: boolean | undefined; // Kills the entire child process tree on `exit`

    //
    // These options control how quickly forever restarts a child process
    // as well as when to kill a "spinning" process
    //
    minUptime?: number | undefined; // Minimum time a child process has to be up. Forever will 'exit' otherwise.
    spinSleepTime?: number | undefined; // Interval between restarts if a child is spinning (i.e. alive < minUptime).

    //
    // Command to spawn as well as options and other vars
    // (env, cwd, etc) to pass along
    //
    command?: string | undefined; // Binary to run (default: 'node')
    args?: string[] | undefined; // Additional arguments to pass to the script,
    sourceDir?: string | undefined; // Directory that the source script is in

    //
    // Options for restarting on watched files.
    //
    watch?: boolean | undefined; // Value indicating if we should watch files.
    watchIgnoreDotFiles?: boolean | undefined; // Whether to ignore file starting with a '.'
    watchIgnorePatterns?: string[] | undefined; // Ignore patterns to use when watching files.
    watchDirectory?: string | undefined; // Top-level directory to watch from. You can provide multiple watchDirectory options to watch multiple directories (e.g. for cli: forever start -w='app' -w='some_other_directory' app\index.js)

    //
    // All or nothing options passed along to `child_process.spawn`.
    //
    spawnWith?: SpawnWith | undefined;
    //
    // More specific options to pass along to `child_process.spawn` which
    // will override anything passed to the `spawnWith` option
    //
    env?: NodeJS.ProcessEnv | undefined;
    cwd?: string | undefined;
    //
    // Log files and associated logging options for this instance
    //
    logFile?: string | undefined; // Path to log output from forever process (when daemonized)
    outFile?: string | undefined; // Path to log output from child stdout
    errFile?: string | undefined; // Path to log output from child stderr
    //
    // ### function parseCommand (command, args)
    // #### @command {String} Command string to parse
    // #### @args    {Array}  Additional default arguments
    //
    // Returns the `command` and the `args` parsed from
    // any command. Use this to modify the default parsing
    // done by 'forever-monitor' around spaces.
    //
    parser?(command: string, args: string[]): { command: string; args: string[] };
  };

  /**
   * Starts a script with forever as a daemon.
   * @param script {string} Location of the script to run.
   * @param options {Object} Configuration for forever instance.
   */
  export const startDaemon: (script: string, options?: MonitorOptions) => void;

  /**
   * Stops the process(es) with the specified index or script name in the list of all processes.
   * @param target Index or script name to stop.
   * @param format Indicated if we should CLI format the returned output.
   */
  export const stop: (target: string, format?: boolean) => void;

  /**
   * Restarts the process(es) with the specified index or script name in the list of all processes.
   * @param target Index or script name to restart.
   * @param format Indicated if we should CLI format the returned output.
   */
  export const restart: (target: string, format?: boolean) => void;

  // TODO(mykola): Get full ForeverProcess type.
  export type ForeverProcess = {
    ctime: number;
    foreverPid: number;
    pid: number;
    uid: string;
    running: boolean;
    restarts: number;
    socket: string;
  };

  /**
   * Returns the list of all process data managed by forever.
   * @param format Indicated if we should CLI format the returned output.
   * @param callback Continuation to respond to when complete.
   */
  export const list: (format: boolean, callback: (err: Error, processes: ForeverProcess[]) => void) => void;

  export const kill: (pid: number, killTree?: boolean, signal?: string, callback?: () => any) => void;
}
