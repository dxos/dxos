//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import chalk from 'chalk';
import path from 'path';

export type LogBuildError = {
  file: string;
  code: string;
  err: string;
  text: string[];
};

export type LogTestError = {
  num: number;
  group: string;
  test: string;
  text: string[];
};

export type LogTestSuite = {
  passing: number;
  failing: number;
  tests: LogTestError[];
};

export type LogSection = {
  project: string;
  target: string;
  text: string[];
  buildErrors: LogBuildError[];
  testSuite?: LogTestSuite;
};

export type LogReport = {
  jobUrl: string;
  sections: LogSection[];
};

/**
 * A fairly dumb log parser.
 */
export class LogParser {
  // > nx run react-appkit:build
  static command = /^> nx run (\S+):(\S+)/;

  // TODO(burdon): (End of report).
  static failedTasks = /Failed tasks:/;

  // packages/apps/patterns/react-appkit/src/hooks/useTelemetry.ts:8:32 - error TS2307: Cannot find module '@dxos/react-async' or its corresponding type declarations.
  static buildError = /^(\S+) - error (\S+): (.+)/;

  // TODO(burdon): Change mocha reporter?
  static testSuitePassing = /^ (\d+) passing/;
  static testSuiteFailing = /^ (\d+) failing/;
  static test = /^\s\s(\d+)\) (.+)/;

  parse(document: string): LogSection[] {
    const sections: LogSection[] = [];

    let section: LogSection | undefined;
    let buildError: LogBuildError | undefined;
    let testSuite: LogTestSuite | undefined;
    let test: LogTestError | undefined;

    const lines = document.split('\n');
    for (let i = 0; i < lines.length; i) {
      let line = lines[i++];
      let match;

      //
      // Sections
      //

      match = line.match(LogParser.command);
      if (match) {
        const [, project, target] = match;
        section = {
          project,
          target,
          text: [],
          buildErrors: []
        };

        sections.push(section);
        buildError = undefined;
        continue;
      }

      //
      // Build errors
      //

      match = line.match(LogParser.buildError);
      if (match) {
        assert(section);
        const [, file, code, err] = match;
        buildError = {
          file,
          code,
          err,
          text: []
        };

        section.buildErrors.push(buildError);
        continue;
      }

      //
      // Test errors
      //

      match = line.match(LogParser.testSuitePassing);
      if (match) {
        assert(section);
        const [, passing] = match;

        line = lines[i++];
        match = line.match(LogParser.testSuiteFailing);
        const [, failing] = match ?? [];

        testSuite = {
          passing: parseInt(passing),
          failing: failing ? parseInt(failing) : 0,
          tests: []
        };

        section.testSuite = testSuite;
        continue;
      }

      if (testSuite && testSuite.failing > testSuite.tests.length) {
        match = line.match(LogParser.test);
        if (match) {
          const [, num, group] = match;
          assert(parseInt(num) === testSuite.tests.length + 1);

          test = {
            num: testSuite.tests.length + 1,
            group,
            test: lines[i++].trim(),
            text: []
          };

          testSuite.tests.push(test);
          continue;
        }
      }

      //
      // Text
      //

      const text = line.trim();
      if (text.length) {
        if (test) {
          test.text.push(text);
        } else if (buildError) {
          buildError.text.push(text);
        } else if (section) {
          section.text.push(text);
        }
      }
    }

    return sections;
  }
}

export type LogOptions = {
  skipPassing?: boolean;
  skipText?: boolean;
};

export class LogPrinter {
  // prettier-ignore
  constructor(
    private readonly _logger: (...args: any[]) => void,
    private readonly _filePrefix: string
  ) {}

  logReport(report: LogReport, options: LogOptions = { skipPassing: true, skipText: true }) {
    // TODO(burdon): Other metadata.
    this._logSection(report.jobUrl, false);

    report.sections.forEach((section) => {
      const hasErrors = section.buildErrors.length || section.testSuite;
      if (!hasErrors && options.skipPassing) {
        return;
      }

      this._logSection(`${chalk.blue(section.project)}:${chalk.green(section.target)}`);
      !options.skipText && this._logger(`\n${chalk.dim.grey(section.text.join('\n'))}`);

      section.buildErrors.forEach(({ file, code, err, text }) => {
        const filepath = path.join(this._filePrefix, file);
        this._logger(`${chalk.dim.blue(filepath)}\n${chalk.red(code)}: ${chalk.dim.green(err)}`);
        !options.skipText && this._logger(`\n${chalk.dim.grey(text.join('\n'))}`);
      });

      if (section.testSuite) {
        const { passing, failing, tests } = section.testSuite;
        this._logger(`Passing: ${chalk.green(passing)}`);
        if (failing) {
          this._logger(`Failing: ${chalk.red(failing)}`);
          tests.forEach(({ num, group, test, text }) => {
            this._logger(`\n[${num}] (${chalk.blue(group)}) ${test}\n`);
            !options.skipText && this._logger(`\n${chalk.dim.grey(text.join('\n'))}`);
          });
        }
      }
    });
  }

  _logSection(text: string, newline = true) {
    newline && this._logger();
    this._logger(chalk.grey('##'));
    this._logger(`${chalk.grey('##')} ${text}`);
    this._logger(chalk.grey('##'));
    newline && this._logger();
  }
}
