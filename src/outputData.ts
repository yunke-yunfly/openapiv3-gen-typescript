import type { JSONSchema4 } from 'json-schema';
import pascalcase from 'pascalcase';

import type { ResolvedApisType } from './apis';
import { ConfigType } from './config';
import { compileSchema } from './utils';

export interface OutputData {
  fileName: string;
  content: string;
}

/**
生成目标目录结构
.
|-- types.d.ts  # 对应 bff 中独立定义的 interface
|-- api.d.ts # 对应接口的定义
└-- apis # 生成的接口目录
  |-- user.ts # UserController 对应的接口
  └-- oss.ts # OssController 对应的接口
 */
export async function getOutputData(
  apis: ResolvedApisType[],
  definitions: JSONSchema4['definitions'],
  config: ConfigType,
): Promise<OutputData[]> {
  const typesDTs = await getCommonDTs(definitions);
  const res: OutputData[] = [];
  if (typesDTs && typesDTs.content) {
    res.push(typesDTs);
  }
  return [...res, ...getApiDTs(apis, config), ...getApis(apis, config)];
}

// 获取 common.d.ts
export async function getCommonDTs(
  definitions: JSONSchema4['definitions'],
): Promise<OutputData | undefined> {
  if (!definitions) return undefined;
  const content = await Promise.all(
    Object.keys(definitions).map((name) =>
      compileSchema({ ...definitions[name], definitions }, name),
    ),
  );

  // 去重
  const uniqueInterface = Array.from(
    new Set(
      content
        .join('')
        .split('export ')
        .filter((item) => Boolean(item.trim()))
        .map((item: string) => `export ${item.trim()}`),
    ),
  );

  return {
    fileName: 'common.d.ts',
    content: uniqueInterface.join('\n'),
  };
}

// 获取 api.d.ts
export function getApiDTs(apis: ResolvedApisType[], config: ConfigType): OutputData[] {
  const apisWithType = apis.map((item) => ({
    type: combineSingleType(item, config),
    fileName: item.fileName,
  }));

  // 聚合单个文件的内容
  const apisFilesObj = apisWithType.reduce((acc, cur) => {
    const key = cur.fileName || '';
    if (!acc[key]) {
      acc[key] = {
        content: '',
        fileName: cur.fileName || '',
      };
    }
    acc[key].content += cur.type;
    return acc;
  }, {} as Record<string, { content: string; fileName: string }>);

  const apisTypes = Object.values(apisFilesObj).map((item) => ({
    content: `${
      item.content.includes('Types') ? "import Types from '../common';\n" : ''
    }export namespace ${pascalcase(item.fileName)} {\n ${
      item.content
    }\n}\nexport default ${pascalcase(item.fileName)}`,
    fileName: `./types/${item.fileName}.d.ts`,
  }));
  const indexType = apisTypes
    .map((item) => `export * from '${item.fileName.substr(0, item.fileName.length - 5)}'`)
    .join('\n');

  return [
    {
      fileName: './types.d.ts',
      content: indexType,
    },
    ...apisTypes,
  ];
}

// 获取接口文件
export function getApis(apis: ResolvedApisType[], config: ConfigType): OutputData[] {
  const requestTemplate = config.requestTemplate
    ? config.requestTemplate
    : `import request from '${config.axiosFilePath}'`;
  const apiHeaderStr = (fileName: string) => `${requestTemplate}
import Api from '../types/${fileName}'
`;

  const combinedApis: OutputData[] = apis.map((api) => ({
    content: combineSingleApi(api),
    fileName: api.fileName || '',
  }));

  // 以文件名作为 key，一次性输出单个文件的所有内容
  const combinedContents = combinedApis.reduce((acc, cur) => {
    const key = cur.fileName;
    if (!acc[key]) {
      acc[key] = {
        content: apiHeaderStr(key),
        fileName: `./apis/${key}.ts`,
      };
    }
    acc[key].content += `${cur.content}\n`;
    return acc;
  }, {} as Record<string, OutputData>);

  return [...Object.values(combinedContents)];
}

/**
 * 生成单个类型定义
 * @example
export namespace LoginUser {

  // 请求参数
  export interface Body {
    "username": string;
    "password": string;
  }

  // 响应结果
  export type Data = User

  // 接口响应
  export type Response = Promise<ApiResponse<Data>>
}
 */
export function combineSingleType(api: ResolvedApisType, config: ConfigType): string {
  const params = [api.query, api.body, api.header, api.cookie].filter(Boolean).join('\n  ');
  return `${api.fnComment || ''}export namespace ${pascalcase(api.fnName)} {
      ${params}
      ${api.response ? api.response : 'export type Data = any'}
      export type Response = ${
        config.successResponseTemplate ? 'Promise<ApiResponse<Data>>' : 'Promise<Data>'
      }
    }
  `;
}

/**
 * 组合单个接口
 * @example
 * combineSingleApi(api) // =>
 * `
    export function loginUser(request: Api.LoginUser.request): Api.LoginUser.Response {
      return request({
        url: "/api/user/login",
        method: 'POST',
        data: request
      })
    }
 * `
 */
export function combineSingleApi(api: ResolvedApisType): string {
  const pascalFnName = pascalcase(api.fnName);
  const otherParams = [
    { name: 'query', data: api.query, request: 'params: query' },
    { name: 'body', data: api.body, request: 'data: body' },
    { name: 'header', data: api.header, request: 'headers: header' },
    { name: 'cookie', data: api.cookie, request: 'cookie' },
  ].filter((item) => item.data);

  const otherParamsNames = otherParams
    .map((item) => `${item.name}: Api.${pascalFnName}.${pascalcase(item.name)}`)
    .join(', ');

  const url = api.params ? `\`${api.url}\`` : `'${api.url}'`;

  const otherParamsRequests = otherParams.map((item) => item.request).join(',\n    ');

  return `${api.fnComment || ''}export function ${api.fnName}(${
    api.params && otherParamsNames ? `${api.params}, ` : api.params || ''
  }${otherParamsNames || ''}): Api.${pascalFnName}.Response {
  return request({
    method: '${(api.method || 'GET').toUpperCase()}',
    url: ${url},
    ${otherParamsRequests}
  })
}
`;
}
