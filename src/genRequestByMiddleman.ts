import * as path from 'path';

import { genRequest } from './index';
import { ResolverType } from './resolver';

interface AnyOpt {
  [props: string]: any;
}

interface GenRequestOptions {
  openapi: string | AnyOpt;
  outputDir?: string;
  axiosFilePath?: string;
  header?: boolean;
  cookie?: boolean;
  prettierConfig?: string;
  resolver?: ResolverType;
}

type RequiredGenRequestOptions = Omit<GenRequestOptions, 'outputDir'> & { outputDir: string };

interface ConfigOptions extends GenRequestOptions {
  // genRequest?: GenRequestOptions;
}

export function defineConfig(options: ConfigOptions): ConfigOptions {
  return options;
}

export function getConfigFile(): ConfigOptions {
  try {
    return require(path.join(process.cwd(), './gen-request.config.js'));
  } catch (err: any) {
    if ((err.details || err.message).indexOf('Cannot find module') > -1) {
      throw '[openapi-gen-request]：根目录没有 gen-request.config.js 文档配置文件';
    } else {
      throw err;
    }
  }
}

/**
 * 获得 gen request 配置项
 */
export function getConfig(fileConfig: ConfigOptions): RequiredGenRequestOptions {
  const config = {
    outputDir: path.join(process.cwd(), './src/api'),
    header: false,
    cookie: false,
    ...fileConfig,
  };
  return config;
}

export async function genRequestByMiddleman(branch: string = 'master'): Promise<void> {
  const fileConfig = getConfigFile();
  const newConfig = getConfig(fileConfig);

  await genRequest({
    ...newConfig,
    resolver: {
      fileName: ({ tags }) => tags![0].replace('Controller', '').toLowerCase(),
      fnName: ({ operationId }) => {
        const arr = operationId!.split('.');
        return arr.length >= 2 ? arr[2] : arr[0];
      },
      header: newConfig.header ? undefined : () => undefined,
      cookie: newConfig.cookie ? undefined : () => undefined,
      ...(newConfig.resolver || {}),
    },
  });
}
