#!/usr/bin/env node
import { createWriteStream } from "fs";
import { normalize } from "path";
import K6Parser from "./index";
import * as yargs from "yargs";

yargs
  .scriptName("k6-to-junit")
  .usage("Usage: $0 [options]")
  .command(
    "$0 [out]",
    "",
    yargs => {
      yargs.positional("o", {
        alias: "out",
        desc: "the output file",
        type: "string"
      });
    },
    async argv => {
      const k6Parser = new K6Parser();
      const output = argv.o && process.stdout;
      await k6Parser.pipeFrom(process.stdin, { output });
      const writer = argv.o ? createWriteStream(normalize(argv.o as string)) : process.stdout;
      k6Parser.toXml(writer);
      writer.once("finish", () => {
        process.exit(k6Parser.allPassed() ? 0 : 99);
      });
    }
  )
  .help().argv;
