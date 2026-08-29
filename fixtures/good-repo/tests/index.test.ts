import { add } from "../src/index.js";

export function testAdd(): void {
  const result = add(2, 3);
  if (result !== 5) {
    throw new Error(`expected 5, got ${result}`);
  }
}