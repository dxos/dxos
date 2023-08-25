import { Metric } from "@dxos/protocols/proto/dxos/tracing";
import { BaseCounter } from "./base";

export class UnaryCounter extends BaseCounter {
  value: number = 0;
  units?: string;

  constructor({ units }: { units?: string } = {}) {
    super();
    this.units = units;
  }

  inc(by = 1) {
    this.value += by;
  }

  getData(): Metric {
    return {
      name: this.name!,
      counter: {
        value: this.value,
        units: this.units,
      },
    };
  }
}