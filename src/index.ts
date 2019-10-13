import { create, streamWriter } from "xmlbuilder";
import { createInterface } from "readline";
import { EOL } from "os";
import { Writable, Readable } from "stream";

export interface TestSuite {
  name: string;
  thresholds: Threshold[];
  startTime?: number;
  endTime?: number;
  stdout?: string;
}

export interface Threshold {
  name: string;
  passed: boolean;
  systemOut: string;
}

const nameRegex = /script: (.*)$/m;

export function parseLine(line: string): Threshold | null {
  const threshold = /([✓|✗]) (\w*?)\./g.exec(line);
  if (threshold && threshold.length > 2) {
    return {
      systemOut: line,
      passed: threshold[1] === "✓",
      name: threshold[2]
    };
  }
  return null;
}

export function parseName(line: string): string | null {
  const name = nameRegex.exec(line);
  return (name && name[1]) || null;
}

/**
 * https://llg.cubic.org/docs/junit/
 * https://dzone.com/articles/viewing-junit-xml-files-locally
 *
 */
export function toXml(testsuites: TestSuite[], stream?: Writable): string {
  const xmlObj = create("testsuites");
  xmlObj.att("tests", testsuites.reduce((acc, ts) => acc + ts.thresholds.length, 0));
  xmlObj.att("failures", testsuites.reduce((acc, ts) => acc + ts.thresholds.filter(th => !th.passed).length, 0));

  const firstStart = Math.min(...(testsuites.map(ts => ts.startTime).filter(Boolean) as number[]));
  const lastEnd = Math.max(...(testsuites.map(ts => ts.endTime).filter(Boolean) as number[]));
  if (Number.isSafeInteger(lastEnd - firstStart)) {
    xmlObj.att("time", (lastEnd - firstStart) / 1000);
  }

  testsuites.forEach(testsuite => {
    const suiteEle = xmlObj.ele("testsuite");
    suiteEle.att("name", testsuite.name);
    suiteEle.att("tests", testsuite.thresholds.length);
    suiteEle.att("failures", testsuite.thresholds.filter(res => !res.passed).length);

    if (testsuite.startTime) {
      const endTime = testsuite.endTime || Date.now();
      suiteEle.att("time", (endTime - testsuite.startTime) / 1000);
      suiteEle.att("timestamp", new Date(testsuite.startTime).toISOString());
    }

    testsuite.thresholds.forEach(threshold => {
      const testcase = suiteEle.ele("testcase", { name: threshold.name });
      if (!threshold.passed) {
        testcase.ele("failure", { message: threshold.systemOut }, threshold.systemOut);
      }
      if (threshold.systemOut) {
        testcase.ele("system-out", {}, threshold.systemOut);
      }
    });

    if (testsuite.stdout) {
      suiteEle.ele("system-out").cdata(testsuite.stdout);
    }
  });

  return xmlObj.end((stream && streamWriter(stream, { pretty: true })) || { pretty: true });
}

export class K6Parser {
  private _testSuites: TestSuite[] = [];

  public parse(input: string, options?: { name?: string; startTime?: number; endTime?: number }): Promise<void> {
    const inputStream = new Readable();
    const promise = this.pipeFrom(inputStream, options);
    inputStream.push(input);
    inputStream.push(null);
    return promise;
  }

  public pipeFrom(
    input: Readable,
    options?: { name?: string; startTime?: number; endTime?: number; output?: Writable }
  ): Promise<void> {
    let testSuite: Partial<TestSuite> & { thresholds: Threshold[] };
    const reset = (): void => {
      testSuite = {
        name: options && options.name,
        startTime: options && options.startTime,
        stdout: "",
        thresholds: []
      };
    };
    reset();
    const finalise = (): void => {
      if (testSuite.name) {
        const result = {
          name: testSuite.name,
          thresholds: testSuite.thresholds,
          startTime: testSuite.startTime,
          endTime: (options && options.endTime) || Date.now(),
          stdout: testSuite.stdout
        };
        this._testSuites.push(result);
      }
    };

    const rl = createInterface({ input, output: options && options.output });
    rl.on("line", line => {
      if (!testSuite.startTime) {
        testSuite.startTime = Date.now();
      }
      testSuite.stdout += line + EOL;
      const result = parseLine(line);
      if (result) {
        testSuite.thresholds.push(result);
      }
      if (!testSuite.name) {
        const name = parseName(line);
        if (name) {
          testSuite.name = name;
        }
      }
      if (/vus_max.*$/gm.test(line)) {
        finalise();
        reset();
      }
    });
    return new Promise((res, rej) => {
      rl.on("close", () => {
        finalise();
        res();
      });
      rl.on("SIGINT", () => {
        rej();
      });
    });
  }

  public getTestSuites(): TestSuite[] {
    return this._testSuites;
  }

  public allPassed(): boolean {
    return this._testSuites.every(ts => ts.thresholds.every(th => th.passed));
  }

  public toXml(stream?: Writable): string {
    return toXml(this._testSuites, stream);
  }
}
export default K6Parser;
