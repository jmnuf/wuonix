import { describe, test, expect } from "bun:test";
import { Res } from "@jmnuf/results";
import { createSignal, SignalValueChangedEvent } from "../src/index";

const createInitState = () => {
  const initVal = "foo";
  const signal = createSignal(initVal);
  return {
    initVal,
    signal,
  };
};

describe("signal.value property", () => {
  test("Init value is set", () => {
    const { signal, initVal } = createInitState();
    expect(signal.value).toEqual(initVal);
  });
  test("Setting signal.value doesn't change value", () => {
    const { signal, initVal } = createInitState();
    let updateCount = 0;
    signal.listen(() => ++updateCount);
    // @ts-expect-error value is readonly in the types
    Res.syncCall(() => { signal.value = "New value"; });
    expect(updateCount).toEqual(0);
    expect(signal.value).toEqual(initVal);
  });
});

describe("signal update value", () => {
  test("signal.value gets updated", () => {
    const { signal, initVal } = createInitState();
    const newVal = "New value";
    let updateCount = 0;
    expect(signal.value).toEqual(initVal);
    signal(() => {
      ++updateCount;
      return newVal;
    });
    expect(updateCount).toEqual(1);
    expect(signal.value).toEqual(newVal);
  });

  test("signal.listen get event", async () => {
    const { signal, initVal } = createInitState();
    const newVal = "bar";

    const listenParamPromise = new Promise<SignalValueChangedEvent<unknown>>((resolve) => {
      signal.listen(resolve, { once: true });
    });

    signal(() => newVal);

    const param = await listenParamPromise;

    expect(param).toBeInstanceOf(SignalValueChangedEvent);

    expect(param.prv).toEqual(initVal);
    expect(param.cur).toEqual(newVal);
  }, { timeout: 500 });

  test("signal.listen(cb, { once:true }); Cb gets removed after once", async () => {
    const { signal, initVal } = createInitState();
    const newVal = "bar";
    let callCount = 0;
    const cb = () => ++callCount;
    signal.listen(cb, { once: true });

    signal(() => newVal);
    signal(() => initVal);
    signal(() => newVal);

    expect(callCount).toEqual(1);
    expect(signal.value).toEqual(newVal);
  });
});


