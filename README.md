# k6-to-junit

![npm](https://img.shields.io/npm/v/k6-to-junit?style=plastic) ![GitHub release (latest by date)](https://img.shields.io/github/v/release/mattihew/k6-to-junit?label=github&style=plastic)

## Installing

```shell
npm install -g k6-to-junit
```

## Usage as command

the `k6-to-junit` command is created which reads input from the stdin and can output to either stdout or a file.

### Output to stdout

this allows you to pipe the xml outout to another program for further processing

```shell
k6 run script.js | k6-to-junit
```

### Output to file

this passes through the stdin to the stdout

```shell
k6 run script.js | k6-to-junit junit.xml
```

## Usage as library

### `K6Parser`

the main way of using this library is to use the K6Parser class. This allows creating a stateful object that can internaly store multiple test results before outputing them to a single xml structure.

```javascript
const K6Parser = require("k6-to-junit").K6Parser;
const parser = new K6Parser();
```

```typescript
import K6Parser from "k6-to-junit";
const parser = new K6Parser();
```

#### `K6Parser.pipeFrom(input, options)`

- `input` (Readable): a stream to read from.
  Common examples would be reading from stdin or a file

- `options` (optional): options to use when parsing. all of the following are optional.

  - `name` (string): the name to use for the generated TestSuite(s). will be read from input if omited.
  - `startTime` (number): the start time to use for the test. will use `Date.now()` when stream starts if omited.
  - `endTime` (number): the end time to use for the test. will use `Date.now()` when stream ends if omited.
  - `output` (Writable): stream to forward input to. All data written to input stream will be mirrored here.

- Returns a `Promise<void>` that resolves when the input stream closes or rejects if stream is interupted.

```javascript
k6Parser.pipeFrom(process.stdin, { output: process.stdout }).then(() => {
  //do next stuff
});
```

#### `K6Parser.allPassed()`

- Returns false if any currently parsed tests have failed, else returns true.

```javascript
process.exit(k6Parser.allPassed() ? 0 : 99);
```

#### `K6Parser.toXml(stream)`

- `stream` (Writable): an optional writable stream to write to. otherwise returns the xml data as a string.
- Returns a string reprenstation of the junit xml data.

```javascript
k6Parser.toXml(fs.createWriteStream("junit.xml"));
```

## Examples

```javascript
const { spawn } = require("child_process");
const { createWriteStream } = require("fs");
const { K6Parser } = require("k6-to-junit");
const parser = new K6Parser();
parser.pipefrom(spawn("k6", ["run", "k6test.js"]).stdio).then(() => {
  const writer = createWriteStream("junit.xml");
  parser.toXml(writer);
  writer.once("finished", () => {
    process.exit(k6Parser.allPassed() ? 0 : 99);
  });
});
```
