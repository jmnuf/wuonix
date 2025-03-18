import type { Result } from "@jmnuf/results";
import { Res } from "@jmnuf/results";

const SimpSignalSymbol = Symbol("wuonix::SimpSignal");
const BaseSignalSymbol = Symbol("wuonix::SimpSignal.Base");
const ComputedSignalSymbol = Symbol("wuonix::SimpSignal.Computed");

export type BaseSimpSignal<T> = {
  isComputed: false;
  (f: (prev: T) => T): void;
  listen(cb: (event: SignalValueChangedEvent<T>) => void, cfg?: { once?: boolean, signal?: AbortSignal }): void;
  computed<U>(map: (value: T) => U): ComputedSimpSignal<U>;
  readonly value: T;
};
export type SimpSignal<T> = BaseSimpSignal<T> | ComputedSimpSignal<T>;
export type ComputedSimpSignal<T> = {
  isComputed: true;
  (): void;
  listen(cb: (event: SignalValueChangedEvent<T>) => void, cfg?: { once?: boolean, signal?: AbortSignal }): void;
  computed<U>(map: (value: T) => U): ComputedSimpSignal<U>;
  readonly value: T;
};
type InternalSimpSignal<T> = SimpSignal<T> & {
  readonly dependants: SimpSignalDeps;
};
type SimpSignalDeps = Array<{ signal: ComputedSimpSignal<unknown>; mapper: (value: any) => any; }>;

export function isSimpSignal<T = unknown>(obj: any): obj is SimpSignal<T> {
  if (typeof obj !== "function") return false;
  if (!("__tag" in obj) || obj.__tag !== SimpSignalSymbol) return false;
  return true;
}
export function isSignal<T = unknown>(obj: any): obj is InternalSimpSignal<T> {
  if (typeof obj !== "function") return false;
  if (!("__tag" in obj) || obj.__tag !== SimpSignalSymbol) return false;
  if (!("__signal_type" in obj) || [BaseSignalSymbol, ComputedSignalSymbol].includes(obj.__signal_type)) return false;
  return true;
}

export class SignalValueChangedEvent<T> extends Event {
  readonly cur: T;
  readonly prv: T;
  constructor(cur: T, prv: T) {
    super(SignalValueChangedEvent.EVENT_NAME);
    this.cur = cur;
    this.prv = prv;
  }

  static EVENT_NAME = "signal:value-changed";
}

export function createSignal<T>(): BaseSimpSignal<T | undefined>;
export function createSignal<T>(initValue: T): BaseSimpSignal<T>;
export function createSignal(init?: any): any {
  let value = init;
  let deps: SimpSignalDeps = [];
  const eventHandler = new EventTarget();
  const signal = ((f: (prev: any) => any) => {
    const prv = value && typeof value === "object"
      ? Array.isArray(value)
        ? value.slice()
        : Object.assign({}, value)
      : value;
    value = f(value);
    eventHandler.dispatchEvent(new SignalValueChangedEvent<any>(value, prv));
    for (const sub of deps) {
      // @ts-expect-error signals are always callable to change values, making it have no arguments in TS for safety of usage
      sub.signal(() => sub.mapper(value));
    }
  }) as InternalSimpSignal<any>;

  Object.defineProperties(signal, {
    isComputed: {
      enumerable: true,
      configurable: true,
      get() {
        return false;
      },
    },
    value: {
      enumerable: true,
      configurable: false,
      get() {
        return value;
      },
    },
    __tag: {
      enumerable: false,
      configurable: false,
      get() {
        return SimpSignalSymbol;
      },
    },
    dependants: {
      enumerable: false,
      configurable: false,
      get() {
        return deps;
      },
    }
  });

  signal.listen = eventHandler.addEventListener.bind(eventHandler, SignalValueChangedEvent.EVENT_NAME) as any;

  signal.computed = (mapper: (v: any) => any) => {
    const subSignal = createSignal(mapper(value)) as unknown as ComputedSimpSignal<any>;
    Object.defineProperty(subSignal, "isComputed", {
      enumerable: true,
      configurable: false,
      get() {
        return true;
      },
    });
    signal.dependants.push({ signal: subSignal, mapper });
    return subSignal;
  };

  return signal;
}

export function createPromiseSignal<T>(promise: Promise<T>): SimpSignal<{ done: false } | { done: true; result: Result<T> }>;
export function createPromiseSignal<T, U>(promise: Promise<T>, mapper: (v: T) => U): SimpSignal<{ done: false } | { done: true; result: Result<U> }>;
export function createPromiseSignal(promise: Promise<any>, mapper?: (v: any) => any) {
  const doneSignal = createSignal(false);
  let result: Result<any> = Res.Ok(null);
  if (typeof mapper === "function") {
    promise = promise.then((value) => mapper(value));
  }
  promise.then((value: any) => {
    result = Res.Ok(value);
    doneSignal(() => true);
  }).catch((error) => {
    result = Res.Err(error);
    doneSignal(() => true);
  });
  return doneSignal.computed((done) => !done ? { done } : { done, result });
}


export function createAsyncGeneratorSignal<T>(generator: AsyncGenerator<T>): SimpSignal<{ done: false, value: T } | { done: true }>;
export function createAsyncGeneratorSignal<T, U>(generator: AsyncGenerator<T>, mapper: (v: T) => U): SimpSignal<{ done: false; value: U } | { done: true }>;
export function createAsyncGeneratorSignal<T>(generator: AsyncGenerator<T>, mapper?: (v: any) => any) {
  const valueSignal = createSignal<any>(null);
  let done = false;
  (async () => {
    for await (const value of generator) {
      const v = mapper ? mapper(value) : value;
      valueSignal(() => v);
    }
    done = true;
    valueSignal(() => undefined);
  })();
  return valueSignal.computed((value) => ({ done, value } as { done: false, value: any } | { done: true }));
}

export function createDeferedSignal<T, U>(baseSignal: SimpSignal<T>, checker: (v: T) => SimpSignal<U> | undefined) {
  const subSignalState = baseSignal.computed((value) => {
    return checker(value);
  });
  let started = false;
  const valueSignal = createSignal<{ started: false } | { started: true; state: U }>({ started: false });
  subSignalState.listen(({ cur: signal }) => {
    if (!signal) {
      if (started || valueSignal.value.started === false) return;
      valueSignal(() => ({ started: false }));
      return
    }
    started = true;
    signal.listen(({ cur: state }) => {
      valueSignal(() => ({ started: true, state }));
    });
  });
  return valueSignal;
}
