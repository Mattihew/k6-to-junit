#!/usr/bin/env node
import { writeFileSync } from "fs";
import { normalize } from "path";
import { CommandLineParser, CommandLineAction, CommandLineStringParameter } from "@microsoft/ts-command-line";
import K6Parser from './index';

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

    protected async onExecute(): Promise<void> {
        const k6Parser = new K6Parser();
        await k6Parser.pipeFrom(process.stdin, {output: process.stdout});
        if (this._outName && this._outName.value) {
            writeFileSync(normalize(this._outName.value), k6Parser.toXml());
        }
        process.exit(k6Parser.allPassed() ? 0 : 99);
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




