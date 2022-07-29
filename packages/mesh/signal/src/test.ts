
import { createTestBroker } from "./testing";

const broker = createTestBroker();
setTimeout(() => broker.stop(), 5_000);
