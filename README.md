# wuonix

## Simple Signals

A relatively simple typescript library for creating signals. Signals are cool and this library is just for managing non-complexly built state in a relatively straight-forward fashion.

There is a base value signal for keeping track of a value and also you can get a computed signal derived from a base value signal that will get re-computed whenever the base value signal is updated.

Maybe in the future creating a computed signal based on multiple signals will be included, undecided as of now.

Usage:

```ts
import { createSignal } from "@jmnuf/wuonix";

const baseValue = "Hello, World!";
const baseText = createSignal(baseValue);
const lowercaseText = signal.computed((text) => text.toLowerCase());


console.log("baseText.value === baseValue ?", baseText.value === baseValue);
console.log("lowercaseText.value === baseValue.toLowerCase() ?", lowercaseText.value === baseValue.toLowerCase());

baseText.listen(({ prv, cur }) => {
  console.log("Value changed from", prv, "to", cur);
});

baseText(() => "Hi Mom!");
```

## Develop

Install dependencies:

```terminal
$ bun install
```

Build project:

```terminal
$ bun run build
```

Run tests:

```terminal
$ bun run tests
```

or

```terminal
$ bun test
```

This project was created using `bun init` in bun v1.2.4. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.


