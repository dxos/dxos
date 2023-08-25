export abstract class BaseCounter {
  /**
   * @internal
   */
  _instance: any;

  name?: string;

  /**
   * @internal
   */
  _assign(instance: any, name: string) {
    this._instance = instance;
    this.name = name;
  }

  abstract getData(): Record<string, any>;

  _tick(time: number, delta: number): void {}
}