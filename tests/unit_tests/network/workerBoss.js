import { NetWorker } from "../../../static/js/network/workerBoss.mjs";

/**
 * describe("foo", () => {test("bar", () => {});});
 */

describe("Singleton class to start a WebWorker or use an existing.", () => {
  test("Singleton instances are the same.", async () => {
    const db1 = new NetWorker();
    const db2 = new NetWorker();
    expect(db1).toBe(db2);
    
  });
  test("Dump class instance fields.", async () => {
    const result = await NetWorker.getInstance();
    expect(result).toEqual({
      config: { host: "localhost", port: 5432 },
      foo: "bar",
      worker: null,
    });
    const db1 = new NetWorker();
    db1.makeWorker();
  });
});
