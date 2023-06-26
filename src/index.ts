import * as fs from 'fs';
import * as path from 'path';

import chalk from 'chalk';
import del from 'del';
import mkdirp from 'mkdirp';
import type { OpenAPIV3 } from 'openapi-types';
import exec from 'shelljs.exec';

import { getApis, resolveApis } from './apis';
import type { ConfigType } from './config';
import { processConfig } from './config';
import { getOpenApiDoc } from './getOpenApiDoc';
import { OutputData, getOutputData } from './outputData';
import { ResolverType } from './resolver';
import { changeRefValue, getDefinitions } from './utils';

export async function genRequest(config: ConfigType): Promise<void> {
  if (!config.openapi) {
    throw new Error('[openapi-gen-request]: openapi 不存在');
  }
  const startTime = Number(new Date());
  const outputData = await getGenData(config);

  // 8.输出
  await del([config.outputDir], { force: true }); // 删除输出目录
  mkdirp.sync(config.outputDir); // 创建空目录
  mkdirp.sync(path.join(config.outputDir, './apis'));
  mkdirp.sync(path.join(config.outputDir, './types'));

  outputData.forEach((item) => {
    const outputPath = path.join(config.outputDir, item.fileName);
    const content = config.bannerComment + item.content;
    fs.writeFileSync(outputPath, content, 'utf-8');
  });
  const endTime = Number(new Date());
  console.log(
    chalk.green(`[openapi-gen-request]: 生成成功，共耗时 ${(endTime - startTime) / 1000} 秒`),
  );

  // 9.格式化
  const prettier = path.join(process.cwd(), './node_modules/.bin/prettier');
  if (fs.existsSync(prettier)) {
    exec(
      `${prettier} ${config.prettierConfig ? `--config ${config.prettierConfig}` : ''} --write ${
        config.outputDir
      }/**/*`,
    );
    console.log(chalk.gray('\n[openapi-gen-request]: 代码格式化完成'));
  }
}

export async function getGenData(config: ConfigType): Promise<OutputData[]> {
  // 1.获取 openapi 内容
  let openApiDoc: OpenAPIV3.Document = await getOpenApiDoc(config.openapi);

  // 2.更改 $ref 的值
  openApiDoc = changeRefValue(openApiDoc);

  // 3.获取全局的定义（全局类型）
  const definitions = getDefinitions(openApiDoc);

  // 4.处理配置
  config = processConfig(config, definitions);

  // 5.获取简化版的 openapi 数据
  const apis = getApis(openApiDoc);

  // 6.解析后的 api
  const resolvedApis = await resolveApis(apis, config.resolver as Required<ResolverType>);

  // 7.获取输出内容
  const outputData = await getOutputData(resolvedApis, definitions, config);

  return outputData;
}

export default genRequest;
