import * as path from 'path';

import type { JSONSchema4 } from 'json-schema';
import type { OpenAPIV3 } from 'openapi-types';

import { ResolverType, getDefaultResolver } from './resolver';

export interface AnyOpt {
  [props: string]: any;
}

export interface ConfigType {
  /**
   * 支持本地文件，例如 ../doc/openapi.json
   * 支持网络地址，例如 https://www.foo.com/openapi.json
   * 支持直接传递 openapi 对象
   */
  openapi: string | OpenAPIV3.Document | AnyOpt;
  /**
   * 输出目录
   */
  outputDir: string;
  /**
   * 文件路径，指向自定义的 axios 文件
   * 如果是相对路径，则不做任何处理，例如 "../../utils/request"
   * 如果是绝对路径，则会计算出其相对于 outputDir 的路径
   *
   * 需要注意的是此文件必须是使用 export default 默认导出
   */
  axiosFilePath?: string;
  /**
   * 请求模板
   * 其和 axiosFilePath 互斥
   * @example
   * import request from '../util/request'
   * import { request } from '../request'
   * import request from 'axios'
   */
  requestTemplate?: string;
  /**
   * 成功时的 interface 模板
   * @default "T"
   * @example
   * `{
   *    code: number;
   *    data: T;
   *    msg: string;
   * }`
   */
  successResponseTemplate?: string;
  // 自定义处理逻辑
  resolver?: ResolverType;
  // 生成文件顶部注释
  bannerComment?: string;
  // prettier 配置文件，用于格式化输出结果
  prettierConfig?: string;
}

/**
 * 校检配置参数及兼容性处理
 */
export function processConfig(
  config: ConfigType,
  definitions: JSONSchema4['definitions'],
): Required<ConfigType> {
  if (!config.outputDir) {
    throw new Error('[openapi-gen-request]: outputDir 不存在');
  }

  if (config.requestTemplate && !config.requestTemplate.includes('request')) {
    throw new Error(
      '[openapi-gen-request]: requestTemplate 必须包含 `request` 导出。\n例如 import { request } from "../utils/request"',
    );
  }

  if (!path.isAbsolute(config.outputDir)) {
    config.outputDir = path.join(process.cwd(), config.outputDir);
  }

  if (!config.axiosFilePath) {
    config.axiosFilePath = 'axios';
  }

  if (path.isAbsolute(config.axiosFilePath)) {
    // 计算出相对于 outputDir 的路径
    config.axiosFilePath = path.relative(
      path.join(config.outputDir, './apis'),
      config.axiosFilePath,
    );
  }

  config.resolver = Object.assign({}, getDefaultResolver(definitions), config.resolver);

  if (!config.bannerComment) {
    config.bannerComment = `/* eslint-disable */
// @ts-nocheck
/**
 * 此文件由 json-schema-to-request 生成，请不要手动修改！
 * 如果有修改需求，请修改源文件，然后重新生成。
 */\n\n`;
  }

  return config as Required<ConfigType>;
}
