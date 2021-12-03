import { Browser } from './Browser';

export class AppSimulator {
  browser: Browser;

  constructor(browser: Browser) {
    this.browser = browser;
  }
}
