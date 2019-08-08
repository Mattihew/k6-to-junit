#!/usr/bin/env node
import { createInterface } from "readline";
import { writeFileSync } from "fs";
import { normalize } from "path";
import { CommandLineParser, CommandLineAction, CommandLineStringParameter } from "@microsoft/ts-command-line";
import { Threshold, parseLine, toXml } from './index';
import { EOL } from 'os';

class Action extends CommandLineAction {
    private _outName!: CommandLineStringParameter;

    public constructor() {
        super({
            actionName: 'stdin',
            summary: '',
            documentation: ''
        });
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
        const results: Threshold[] = [];
        const startTime = Date.now();
        const rl = createInterface({
            input: process.stdin,
            output: process.stdout
        });
        const sout: string[] = [];
        rl.on('line', input => {
            sout.push(input);
            const result = parseLine(input);
            if (result) {
                results.push(result);
            }
        });

        return new Promise((resolve) => {
            rl.on('close', () => {
                
                const error = results.every(res => res.passed) ? 0 : 99;

                if (this._outName && this._outName.value) {
                    writeFileSync(normalize(this._outName.value), toXml(results, startTime, sout.join(EOL)));
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
        });
        this.addAction(new Action());
    }

    protected onDefineParameters(): void {

    }

    protected onExecute(): Promise<void> {
        return super.onExecute();
    }
}
new Parser().execute();




