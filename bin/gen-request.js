#!/usr/bin/env node

const path = require('path');
// eslint-disable-next-line @typescript-eslint/naming-convention
const { Command } = require('commander');
const { genRequestByMiddleman } = require('../dist/genRequestByMiddleman');

async function main() {
  console.time('生成 request 和 ts 类型');
  const packageJson = require(path.join(process.cwd(), './package.json'));
  // 获取参数
  const program = new Command();
  program
    .version(packageJson.version)
    .option('-b, --branch <branch>', 'gen request')
    .parse(process.argv);

  const options = program.opts();

  const { branch = 'master' } = options || {};
  await genRequestByMiddleman(branch);
  console.timeEnd('生成 request 和 ts 类型');
}

main();
