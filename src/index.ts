import { create } from 'xmlbuilder';

export interface Threshold {
    name: string;
    passed: boolean;
    systemOut: string;
}

function isThreshold(threshold?: Threshold): threshold is Threshold {
    return Boolean(threshold);
}

export function parseLine(line: string): Threshold | undefined {
    const threshold = /([✓|✗]) (\w*?)\./g.exec(line);
    if (threshold && threshold.length > 2) {
        return {
            systemOut: line,
            passed: threshold[1] === '✓',
            name: threshold[2]
        };
    }
    return;
}

export function parse(input: string): Threshold[] {
    return input.split(/\r?\n/).map(parseLine).filter(isThreshold);
}
/**
 * https://llg.cubic.org/docs/junit/
 * https://dzone.com/articles/viewing-junit-xml-files-locally
 * 
 * @param thresholds 
 * @param startTime 
 * @param sout 
 */
export function toXml(thresholds: Threshold[], startTime?: number, sout?: string): string {
    const xmlObj = create('testsuite');
    xmlObj.att('name', 'test');
    xmlObj.att('tests', thresholds.length);
    xmlObj.att('failures', thresholds.filter(res => !res.passed).length);
    if (startTime) {
        xmlObj.att('time', (Date.now() - startTime) / 1000);
        xmlObj.att('timestamp', new Date(startTime).toISOString());
    }
    thresholds.forEach(threshold => {
        const testcase = xmlObj.ele('testcase', { "name": threshold.name });
        if (!threshold.passed) {
            testcase.ele('failure', { "message": threshold.systemOut }, threshold.systemOut);
        }
        testcase.ele('system-out', {}, threshold.systemOut);
    });
    if (sout) {
        xmlObj.ele('system-out', {}, sout);
    }
    

    return xmlObj.end({ pretty: true });
}
