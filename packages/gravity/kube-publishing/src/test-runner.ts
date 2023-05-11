import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import { PublishTestSpec, CacheStatus, EvaluationResult } from './spec';
import { log, run, sleep } from './utils';

const cfCacheHeader = 'cf-cache-status';

export class TestRunner {
  private _appPath: string;
  // Map of file paths to their expected hashes.
  private _filesMap: Record<string, string> = {};
  private _testId = Date.now();

  constructor(
    private readonly _spec: PublishTestSpec,
  ) {
    this._appPath = `out/${this._spec.appName}`;
  }

  private async _checkoutApp() {
    await run(`echo "${this._spec.appName}" | npm init @dxos@latest`, [], { cwd: this._appPath, shell: true });
    await run('npm', ['install'], { cwd: this._appPath });
    await sleep(1_000);
  }

  // Modify each js or ts or html file with dummy code.
  private async _modifyApp(appPath: string, testStep: string) {
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

  private async _pubishApp() {
    // TODO(egorgripasov): Consider using the DX lib directly.
    await run(
      'npx',
      ['dx', 'app', 'publish', '--verbose', '--config', path.join(process.cwd(), '../config.yml')],
      { cwd: this._appPath },
    );
  }

  private async _buildFilesMap(outPath: string, currentPath: string) {
    const files = fs.readdirSync(currentPath);
    for await (const file of files) {
      const filePath = path.join(currentPath, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        await this._buildFilesMap(outPath, filePath)
      } else if (stat.isFile()) {
        const pathDiff = filePath.replace(outPath, '');
        const appFileContent = fs.readFileSync(filePath, 'utf8');
        const appFileHash = crypto.createHash('md5').update(appFileContent).digest('hex');

        this._filesMap[pathDiff] = appFileHash;
      }
    }
  }

  private async _evaluateAppFiles(): Promise<EvaluationResult> {
    let result: EvaluationResult = {};
    for await (const [pathDiff, expectedHash] of Object.entries(this._filesMap)) {
      const kubeFilePath = `https://${this._spec.appName}.${this._spec.kubeEndpoint}${pathDiff}`;
      const response = await fetch(kubeFilePath, { cache: 'no-store' })
      const kubeFileContent = await response.text();
      const kubeFileHash = crypto.createHash('md5').update(kubeFileContent).digest('hex');
      
      const cacheStatus = response.headers.get(cfCacheHeader) ? response.headers.get(cfCacheHeader) as CacheStatus : undefined;

      result[kubeFilePath] = {
        match: expectedHash === kubeFileHash,
        cacheStatus,
      }
    }

    return result;
  }

  async run() {
    // Prepare test env.
    log(`Starting test ${this._testId}...`);

    if (!fs.existsSync(this._appPath)) {
      log('Checking out app...');
      fs.mkdirSync(this._appPath, { recursive: true });
      await this._checkoutApp();
    }

    log('Modifying app for the first time...');
    await this._modifyApp(this._appPath, `${this._testId}step1`);

    log('Publishing app for the first time...');
    await this._pubishApp();

    log('Building files map...');
    const currentPath = path.join(this._appPath, this._spec.outDir);
    await this._buildFilesMap(currentPath, currentPath);

    log(`Waiting for ${this._spec.pubishDelayMs / 1000} sec...`);
    await sleep(this._spec.pubishDelayMs);

    for (let i = 0; i < this._spec.checksCount; i++) {
      const result = await this._evaluateAppFiles();
      const isPassed = Object.values(result).every(val => val.match);

      let out = `Check ${i+1} is ${isPassed ? 'passed' : 'failed'}: \n`;
      out += `In cache: \n ${Object.entries(result).filter(([_, v]) => v.cacheStatus == CacheStatus.HIT).map(e => e[0]).length} files. \n`
      out += `Not in cache: \n ${JSON.stringify(Object.entries(result).filter(([_, v]) => v.cacheStatus == CacheStatus.MISS).map(e => e[0]), null, 4)} \n`
      out += `In cache but expired: \n ${JSON.stringify(Object.entries(result).filter(([_, v]) => v.cacheStatus == CacheStatus.EXPIRED).map(e => e[0]), null, 4)} \n`
      out += `Not supposed to be cached: \n ${JSON.stringify(Object.entries(result).filter(([_, v]) => v.cacheStatus == CacheStatus.BYPASS).map(e => e[0]), null, 4)} \n`
      out += `Not cached by CF: \n ${JSON.stringify(Object.entries(result).filter(([_, v]) => v.cacheStatus == CacheStatus.DYNAMIC).map(e => e[0]), null, 4)} \n`
      out += `\n\n\n`;

      log(out);
      await sleep(this._spec.checksIntervalMs);
    }
  }
}
