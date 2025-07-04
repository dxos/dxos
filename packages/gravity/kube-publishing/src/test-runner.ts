//
// Copyright 2023 DXOS.org
//

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { sleep } from '@dxos/async';
import { log } from '@dxos/log';

import { type PublishTestSpec, CacheStatus, type EvaluationResult } from './spec';
import { run } from './utils';

const cfCacheHeader = 'cf-cache-status';

export class TestRunner {
  private _appPath: string;
  // Map of file paths to their expected hashes.
  private _filesMap: Record<string, string> = {};
  private _testId = Date.now();

  constructor(private readonly _spec: PublishTestSpec) {
    this._appPath = `${os.tmpdir()}/dxos/kube/publishing/${this._spec.appName}`;
  }

  async run(): Promise<void> {
    // Prepare test env.
    log.info('starting test', {
      outDir: this._appPath,
      testId: this._testId,
    });

    if (!fs.existsSync(this._appPath)) {
      log.info('checking out app');
      fs.mkdirSync(this._appPath, { recursive: true });
      await this._checkoutApp();
    }

    log.info('modifying app');
    await this._modifyApp(this._appPath, `${this._testId}step1`);

    log.info('implementing randomness');
    await this._modifyBuildStep();

    log.info('publishing app');
    await this._pubishApp();

    log.info('building files map');
    const currentPath = path.join(this._appPath, this._spec.outDir);
    await this._buildFilesMap(currentPath, currentPath);

    log.info('waiting before start checking', { delay: this._spec.pubishDelayMs });
    await sleep(this._spec.pubishDelayMs);

    for (let i = 0; i < this._spec.checksCount; i++) {
      log.info(`starting checking cycle ${i}`);
      const result = await this._checkFileHashes();
      const isPassed = Object.values(result).every((val) => val.match);

      const testResult = {
        testId: this._testId,
        testStep: i,
        isPassed,
        filesTotal: Object.keys(result).length,
        filesMatched: Object.values(result).filter((val) => val.match).length,
        filesNotMatched: Object.values(result).filter((val) => !val.match).length,
        filesInCache: Object.values(result).filter((val) => val.cacheStatus === CacheStatus.HIT).length,
        filesNotInCache: Object.values(result).filter((val) => val.cacheStatus === CacheStatus.MISS).length,
        filesInCacheButExpired: Object.values(result).filter((val) => val.cacheStatus === CacheStatus.EXPIRED).length,
        filesNotSupposedToBeCached: Object.values(result).filter((val) => val.cacheStatus === CacheStatus.BYPASS)
          .length,
        filesNotCachedByCf: Object.values(result).filter((val) => val.cacheStatus === CacheStatus.DYNAMIC).length,
      };

      log.info('cycle result', testResult);
      await sleep(this._spec.checksIntervalMs);
    }
  }

  private async _checkoutApp(): Promise<void> {
    await run(`echo "${this._spec.appName}" | npm init "@dxos@latest"`, [], { cwd: this._appPath, shell: true });
    await run('npm', ['install'], { cwd: this._appPath });
    await sleep(1_000);
  }

  // Modify each js or ts or html file with dummy code.
  private async _modifyApp(appPath: string, testStep: string): Promise<void> {
    const files = fs.readdirSync(appPath);
    for await (const file of files) {
      const filePath = path.join(appPath, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory() && file !== 'node_modules') {
        await this._modifyApp(filePath, testStep);
      } else if (stat.isFile()) {
        // Append to the end of the file.
        if (file.endsWith('.tsx')) {
          fs.appendFileSync(filePath, `\n export const test${testStep}=1 \n`, 'utf8');
        } else if (file.endsWith('.html')) {
          fs.appendFileSync(filePath, `\n <!-- ${testStep} --> \n`, 'utf8');
        }
      }
    }
    await sleep(1_000);
  }

  // Modifyes app build script to generate more test files.
  private async _modifyBuildStep(): Promise<void> {
    const packageJson = fs.readFileSync(path.join(this._appPath, 'package.json'), 'utf8');
    // TODO(egorgripasov): Read/preserve original build script to make test more extensible.
    const newPackageJson = packageJson.replace(
      /"build": .*/g,
      `"build": "NODE_OPTIONS=\\"--max-old-space-size=4096\\" tsc --noEmit && vite build && for i in {1..${this._spec.randomFilesCount}}; do base64 /dev/urandom | head -c 5000000 > ./out/test-app/file_$RANDOM$RANDOM_$i.js; done",`,
    );
    fs.writeFileSync(path.join(this._appPath, 'package.json'), newPackageJson, 'utf8');
  }

  private async _pubishApp(): Promise<void> {
    // TODO(egorgripasov): Consider using the DX lib directly.
    await run('npx', ['dx', 'app', 'publish', '--verbose', '--config', path.join(process.cwd(), './config.yml')], {
      cwd: this._appPath,
    });
  }

  private async _buildFilesMap(outPath: string, currentPath: string): Promise<void> {
    const files = fs.readdirSync(currentPath);
    for await (const file of files) {
      const filePath = path.join(currentPath, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        await this._buildFilesMap(outPath, filePath);
      } else if (stat.isFile()) {
        const pathDiff = filePath.replace(outPath, '');
        const appFileContent = fs.readFileSync(filePath, 'utf8');
        const appFileHash = crypto.createHash('md5').update(appFileContent).digest('hex');

        this._filesMap[pathDiff] = appFileHash;
      }
    }
  }

  private async _checkFileHashes(): Promise<EvaluationResult> {
    const result: EvaluationResult = {};
    for await (const [pathDiff, expectedHash] of Object.entries(this._filesMap)) {
      const kubeFilePath = `https://${this._spec.appName}.${this._spec.kubeEndpoint}${pathDiff}`;
      const response = await fetch(kubeFilePath, { cache: 'no-store' });
      const kubeFileContent = await response.text();
      const kubeFileHash = crypto.createHash('md5').update(kubeFileContent).digest('hex');

      const cacheStatus = response.headers.get(cfCacheHeader)
        ? (response.headers.get(cfCacheHeader) as CacheStatus)
        : undefined;

      result[kubeFilePath] = {
        match: expectedHash === kubeFileHash,
        cacheStatus,
      };
    }

    return result;
  }
}
