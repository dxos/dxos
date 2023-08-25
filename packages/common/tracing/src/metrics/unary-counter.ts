import { BaseCounter } from "./base";

export class UnaryCounter extends BaseCounter {
  value: number = 0;

  inc(by = 1) {
    this.value += by;
  }

  getData() {
    return {
      value: this.value,
    };
  }
}