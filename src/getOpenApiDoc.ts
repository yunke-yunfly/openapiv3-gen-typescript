// 获取 OpenApi 文档对象
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

import axios from 'axios';
import { OpenAPI, OpenAPIV3 } from 'openapi-types';

const swagger2openapi = require('swagger2openapi');

const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

interface AnyOpt {
  [props: string]: any;
}

/**
 * 获取 openApi 内容
 * 支持本地文件，例如 ../doc/openapi.json
 * 支持网络地址，例如 https://petstore.swagger.io/v2/swagger.json
 * 支持直接传递 openapi 对象
 */
export async function getOpenApiDoc(
  config: string | OpenAPI.Document | AnyOpt,
): Promise<OpenAPIV3.Document> {
  // 参数校检
  if (!config) {
    throw new Error('[openapi-gen-request]: openapi 配置不能为空');
  }

  let data: OpenAPI.Document;
  const { convertObj } = swagger2openapi;

  // 进行类型判断，并获取到数据
  if (typeof config === 'string') {
    if (config.startsWith('http://') || config.startsWith('https://')) {
      data = await getOpenApiDocFromUrl(config);
    } else {
      data = await getOpenApiDocFormPath(config);
    }
  } else {
    data = config as any;
  }

  try {
    const res = await convertObj(data, {
      patch: true,
    });
    return res.openapi;
  } catch (error) {
    throw new Error(`[openapi-gen-request]: 转换失败，失败原因为 ${error}`);
  }
}

// 从远程获取 openApi 资源
export async function getOpenApiDocFromUrl(url: string): Promise<OpenAPI.Document> {
  const result = await axios.get(url);
  if (result.status !== 200) {
    throw new Error(
      `[openapi-gen-request]: 请求 ${url} 未能返回正确响应，具体请求信息为：${result}`,
    );
  }

  return result.data;
}

// 从本地路径获取 openApi 数据
export async function getOpenApiDocFormPath(filePath: string): Promise<OpenAPI.Document> {
  const absoluteFilePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);

  const fileStat = await stat(absoluteFilePath);
  if (!fileStat.isFile) {
    throw new Error(`[openapi-gen-request]: ${filePath} 不是一个文件`);
  }

  let data: OpenAPI.Document;
  const fileContent = await readFile(absoluteFilePath, 'utf-8');

  try {
    data = JSON.parse(fileContent);
  } catch (error) {
    throw new Error(
      `[openapi-gen-request]: 解析错误 ${filePath} 不是一个有效的 openapi 格式文件，${error}`,
    );
  }

  return data;
}
