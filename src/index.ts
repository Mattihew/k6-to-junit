import { create } from 'xmlbuilder';
import { createInterface } from 'readline';
import { EOL } from 'os';

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

function isThreshold(threshold?: unknown): threshold is Threshold {
    return Boolean(threshold && (threshold as Threshold).name);
}

export function parseLine(line: string): Threshold | null {
    const threshold = /([✓|✗]) (\w*?)\./g.exec(line);
    if (threshold && threshold.length > 2) {
        return {
            systemOut: line,
            passed: threshold[1] === '✓',
            name: threshold[2]
        };
    }
    return null;
}

export function parseName (line: string): string | null {
    const nameExec = /script: (.*)$/m.exec(line);
    return nameExec && nameExec[1] || null;
}

export function parse(input: string): TestSuite {
    const thresholds = input.split(/\r?\n/).map(parseLine).filter(isThreshold);
    const name = parseName(input) || 'test';
    return {
        name,
        thresholds,
        stdout: input
    };
}
/**
 * https://llg.cubic.org/docs/junit/
 * https://dzone.com/articles/viewing-junit-xml-files-locally
 * 
 */
export function toXml (testsuites: TestSuite[]): string{
    const xmlObj = create('testsuites');
    xmlObj.att('tests', testsuites.reduce((acc, ts) => acc + ts.thresholds.length, 0));
    xmlObj.att('failures', testsuites.reduce((acc, ts) => acc + ts.thresholds.filter(th => !th.passed).length, 0));
    
    const firstStart = Math.min(...testsuites.map(ts => ts.startTime).filter(Boolean) as number[]);
    const lastEnd = Math.max(...testsuites.map(ts => ts.endTime).filter(Boolean) as number[]);
    if (Number.isSafeInteger(lastEnd - firstStart)) {
        xmlObj.att('time', (lastEnd - firstStart) / 1000);
    }
    

    testsuites.forEach(testsuite => {
        const suiteEle = xmlObj.ele('testsuite');
        suiteEle.att('name', testsuite.name);
        suiteEle.att('tests', testsuite.thresholds.length);
        suiteEle.att('failures', testsuite.thresholds.filter(res => !res.passed).length);

        if (testsuite.startTime) {
            const endTime = testsuite.endTime || Date.now();
            suiteEle.att('time', (endTime - testsuite.startTime) / 1000);
            suiteEle.att('timestamp', new Date(testsuite.startTime).toISOString());
        }

        testsuite.thresholds.forEach(threshold => {
            const testcase = suiteEle.ele('testcase', { "name": threshold.name });
            if (!threshold.passed) {
                testcase.ele('failure', { "message": threshold.systemOut }, threshold.systemOut);
            }
            testcase.ele('system-out', {}, threshold.systemOut);
        });

        if (testsuite.stdout) {
            suiteEle.ele('system-out').cdata(testsuite.stdout);
        }
    });

    return xmlObj.end({ pretty: true });
}

export default class K6Parser {
    private _testSuites: TestSuite[] = [];

    public parse(input: string, options?: {name?: string; startTime?: number; endTime?: number}): void {
        this._testSuites.push({...parse(input), endTime: Date.now(), ...options});
    }

    public pipeFrom(input: NodeJS.ReadStream, options?: {name?: string; startTime?: number; output?: NodeJS.WriteStream}): Promise<void> {
        let startTime = options && options.startTime;
        let suiteName = options && options.name;
        const stdout: string[] = [];
        const thresholds: Threshold[] = [];
        const rl = createInterface({input, output: options && options.output});
        rl.on('line', line => {
            if (!startTime) {
                startTime = Date.now();
            }
            stdout.push(line);
            const result = parseLine(line);
            if (result) {
                thresholds.push(result);
            }
            if (!suiteName) {
                const name = parseName(line);
                if (name) {
                    suiteName = name;
                }
            }
            
        });
        return new Promise((res, rej) => {
            rl.on('close', () => {
                const testSuite = {
                    name: suiteName || 'test',
                    thresholds,
                    startTime,
                    endTime: Date.now(),
                    stdout: stdout.join(EOL)
                };
                this._testSuites.push(testSuite);
                res();
            });
            rl.on('SIGINT', () => {
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

    public toXml(): string {
        return toXml(this._testSuites);
    }
}
