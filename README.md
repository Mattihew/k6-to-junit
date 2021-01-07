# k6-to-junit

![https://www.npmjs.com/package/k6-to-junit](https://img.shields.io/npm/v/k6-to-junit?style=plastic) ![https://github.com/Mattihew/k6-to-junit](https://img.shields.io/github/v/release/mattihew/k6-to-junit?label=github&style=plastic)

## Description

k6-to-junit is a simple command line utility to convert the stdout of k6 tests into a junit xml format ready to be used for ci tools such as jenkins.

Currently this just works by looking for thresholds in the output and creating a testcase for each threshold in the output xml file.

Given the following output the below xml file will be created

```properties

          /\      |‾‾|  /‾‾/  /‾/   
     /\  /  \     |  |_/  /  / /    
    /  \/    \    |      |  /  ‾‾\  
   /          \   |  |‾\  \ | (_) | 
  / __________ \  |__|  \__\ \___/ .io

  execution: local
     output: json=k6/exampleResults.json
     script: /k6/test/example.k6.js

    duration: -, iterations: 20
         vus: 1, max: 1

    ✗ is status 200
     ↳  50% — ✓ 10 / ✗ 10
    ✗ not empty
     ↳  50% — ✓ 10 / ✗ 10

  ✓ checks.....................: 50.00% ✓ 20  ✗ 20 
    data_received..............: 18 kB  29 kB/s
    data_sent..................: 2.0 kB 3.2 kB/s
  ✗ errors.....................: 50.00% ✓ 10  ✗ 10 
    http_req_blocked...........: avg=1.29ms  min=2.4µs   med=3.45µs  max=25.87ms p(90)=4.52µs  p(95)=1.29ms 
    http_req_connecting........: avg=1.19ms  min=0s      med=0s      max=23.98ms p(90)=0s      p(95)=1.19ms 
    http_req_duration..........: avg=30.69ms min=26.53ms med=28.75ms max=44.37ms p(90)=35.74ms p(95)=41.02ms
    http_req_receiving.........: avg=47.19µs min=27µs    med=43.3µs  max=92.6µs  p(90)=58.72µs p(95)=64µs   
    http_req_sending...........: avg=17.44µs min=8.9µs   med=11.8µs  max=103.6µs p(90)=17.49µs p(95)=39.66µs
    http_req_tls_handshaking...: avg=0s      min=0s      med=0s      max=0s      p(90)=0s      p(95)=0s     
    http_req_waiting...........: avg=30.63ms min=26.47ms med=28.69ms max=44.17ms p(90)=35.68ms p(95)=40.94ms
    http_reqs..................: 20     31.052819/s
    iteration_duration.........: avg=32.19ms min=26.75ms med=28.97ms max=70.59ms p(90)=35.96ms p(95)=42.54ms
    iterations.................: 20     31.052819/s
    vus........................: 1      min=1 max=1
    vus_max....................: 1      min=1 max=1

```

```xml
<?xml version="1.0"?>
<testsuites tests="2" failures="1" time="0.839">
  <testsuite name="/k6/test/example.k6.js" tests="2" failures="1" time="0.839" timestamp="2019-11-25T18:17:45.353Z">
    <testcase name="checks">
      <system-out>  ✓ checks.....................: 50.00% ✓ 20  ✗ 20 </system-out>
    </testcase>
    <testcase name="errors">
      <failure message="  ✗ errors.....................: 50.00% ✓ 10  ✗ 10 ">  ✗ errors.....................: 50.00% ✓ 10  ✗ 10 </failure>
      <system-out>  ✗ errors.....................: 50.00% ✓ 10  ✗ 10 </system-out>
    </testcase>
    <system-out>
      <!-- Raw output from k6 command -->
    </system-out>
  </testsuite>
</testsuites>
```

## Installing

```shell
npm install -g k6-to-junit
```

## Usage as command

the `k6-to-junit` command is created which reads input from the stdin and can output to either stdout or a file.

### Output to stdout

this allows you to pipe the xml output to another program for further processing

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
const test = spawn("k6", ["run", "test.js"]);

parser.pipeFrom(test.stdout).then(() => {
  const writer = createWriteStream("junit.xml");
  parser.toXml(writer);
  writer.once("finished", () => {
    process.exit(parser.allPassed() ? 0 : 99);
  });
});

```
