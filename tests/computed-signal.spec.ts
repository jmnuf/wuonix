import { describe, test, expect } from "bun:test";
import { Res } from "@jmnuf/results";
import { createSignal, SignalValueChangedEvent } from "../src/index";

const createInitState = () => {
  const initVal = "Foo";
  const signal = createSignal(initVal);
  return {
    initVal,
    signal,
  };
};

describe("computed.value", () => {
  test("Computed value computed on creation", () => {
    const { initVal, signal } = createInitState();
    const mapper = (str: string) => str.toLowerCase();
    const computed = signal.computed(mapper);

    expect(signal.value).toEqual(initVal);

    expect(computed.value).toEqual(mapper(initVal));
  });

  test("Computed value re-computes when base value changes", () => {
    const { initVal, signal } = createInitState();
    const mapper = (str: string) => str.toLowerCase();
    const computed = signal.computed(mapper);

    expect(signal.value).toEqual(initVal);
    expect(computed.value).toEqual(mapper(initVal));

    let otherVal = "Bar";
    signal(() => otherVal);
    expect(signal.value).toEqual(otherVal);
    expect(computed.value).toEqual(mapper(otherVal));

    otherVal = "Baz";
    signal(() => otherVal);
    expect(signal.value).toEqual(otherVal);
    expect(computed.value).toEqual(mapper(otherVal));
  });
});

describe("computed.listen", () => {
  test("computed.listen get event", async () => {
    const { signal, initVal } = createInitState();
    const mapper = (str: string) => str.toLowerCase();
    const computed = signal.computed(mapper);
    const newVal = "Bar";

    const listenParamPromise = new Promise<SignalValueChangedEvent<unknown>>((resolve) => {
      computed.listen(resolve, { once: true });
    });

    signal(() => newVal);

    const param = await listenParamPromise;

    expect(param).toBeInstanceOf(SignalValueChangedEvent);

    expect(param.prv).toEqual(mapper(initVal));
    expect(param.cur).toEqual(mapper(newVal));
  }, { timeout: 500 });

  test("computed.listen(cb, { once:true }); Cb gets removed after once", async () => {
    const { signal, initVal } = createInitState();
    const mapper = (str: string) => str.toLowerCase();
    const computed = signal.computed(mapper);
    const newVal = "Bar";
    let callCount = 0;
    const cb = () => ++callCount;
    computed.listen(cb, { once: true });

    signal(() => newVal);
    signal(() => initVal);
    signal(() => newVal);

    expect(callCount).toEqual(1);
    expect(computed.value).toEqual(mapper(newVal));
  });
});

