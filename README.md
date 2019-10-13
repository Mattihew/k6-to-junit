# k6-to-junit

## Installing

```shell
npm install -g k6-to-junit
```

## Usage

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
