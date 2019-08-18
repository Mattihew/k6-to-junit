import { spawnSync } from "child_process";
import { parse } from "./index";

const k6Command = [
  "run",
  "-v",
  "C:\\Users\\Matt\\Code\\git\\k6tojunit:/k6",
  "--name",
  "k6Test",
  "--rm",
  "loadimpact/k6",
  "run",
  //'--out', 'json=k6/test/exampleResults.json',
  "/k6/test/example.k6.js"
];

test("parse sync", () => {
  const k6Result = spawnSync("docker", k6Command);
  const text = String(k6Result.stdout);
  console.log(text);
  const testSuites = parse(text);
  expect(testSuites).toHaveLength(1);
  expect(testSuites[0].thresholds).toHaveLength(2);
  expect(testSuites[0].thresholds.filter(t => t.passed)).toHaveLength(1);
});
