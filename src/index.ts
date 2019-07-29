#!/usr/bin/env node
import { create } from "xmlbuilder";
import { createInterface } from "readline";
import { writeFileSync } from "fs";
import { normalize } from "path"
import { CommandLineParser, CommandLineAction, CommandLineStringParameter } from "@microsoft/ts-command-line";

interface Result {
    name: string,
    passed: boolean,
    systemOut: string
}

class Action extends CommandLineAction {
    private _outName!: CommandLineStringParameter;

    public constructor() {
        super({
            actionName: 'stdin',
            summary: '',
            documentation: ''
        })
    }

    protected onDefineParameters(): void {
        this._outName = this.defineStringParameter({
            parameterLongName: '--out',
            parameterShortName: '-o',
            description: 'The output file',
            argumentName: 'OUTPUT_FILE'
        });
    }

    protected onExecute(): Promise<void> {
        const results: Result[] = [];
        const startTime = Date.now();
        const rl = createInterface({
            input: process.stdin,
            output: process.stdout
        });
        let sout = '';
        rl.on('line', input => {
            sout += input + '\n';
            const threshold = /([✓|✗]) (\w*?)\./g.exec(input);
            if (threshold && threshold.length > 2) {
                results.push({
                    systemOut: input,
                    passed: threshold[1] === '✓',
                    name: threshold[2]
                });
            }
        });

        return new Promise((resolve, reject) => {
            rl.on('close', () => {
                //https://llg.cubic.org/docs/junit/
                //https://dzone.com/articles/viewing-junit-xml-files-locally

                let error = results.every(res => res.passed) ? 0 : 99

                if (this._outName && this._outName.value) {
                    
                    const xmlObj = create('testsuite')
                    xmlObj.att('name', 'test');
                    xmlObj.att('tests', results.length);
                    xmlObj.att('failures', results.filter(res => !res.passed).length);
                    xmlObj.att('time', (Date.now() - startTime) / 1000);
                    xmlObj.att('timestamp', new Date(startTime).toISOString());
                    results.forEach(result => {
                        const testcase = xmlObj.ele('testcase', { "name": result.name });
                        if (!result.passed) {
                            testcase.ele('failure', { "message": result.systemOut }, result.systemOut);
                        }
                        testcase.ele('system-out', {}, result.systemOut);
                    });
                    xmlObj.ele('system-out', {}, sout);

                    const xmlStr = xmlObj.end({ pretty: true });
                    writeFileSync(normalize(this._outName.value), xmlStr);
                }

                resolve();
                process.exit(error);
            });
        });
    }
}

class Parser extends CommandLineParser {
    public constructor() {
        super({
            toolFilename: 'k6-to-junit',
            toolDescription: 'tool to convert k6 output to junit xml data'
        })
        this.addAction(new Action());
    }

    protected onDefineParameters(): void {

    }

    protected onExecute(): Promise<void> {
        return super.onExecute();
    }
}
new Parser().execute();




