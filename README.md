# @yunflyjs/openapiv3-gen-typescript

[![npm version](https://img.shields.io/npm/v/openapiv3-gen-typescript.svg)](https://www.npmjs.com/package/openapiv3-gen-typescript) ![Test](https://github.com/yunke-yunfly/openapiv3-gen-typescript/workflows/Test/badge.svg) [![codecov](https://codecov.io/gh/yunke-yunfly/openapiv3-gen-typescript/branch/master/graph/badge.svg)](https://app.codecov.io/gh/yunke-yunfly/openapiv3-gen-typescript)

## 简介

通过 openapi3 或者 swagger 格式的文件生成前端类型定义和请求代码。

![demo](https://yunke-oss.oss-cn-hangzhou.aliyuncs.com/bff-basis-fe-sites/imgs/2021/09/28/1632822472211-0-request-gen.gif)

## 特性

- 支持 axios 定义
- 支持解析过程自定义

## 使用

- 1.：安装依赖

```bash
yarn add @yunflyjs/openapiv3-gen-typescript -D
```

2. 创建配置文件

我们在根目录增加 `gen-request.config.js`，其内容为：

```js
module.exports = {
  middleman: {
    openapi: './openapi.json',
  },
};
```

3. 添加 `scripts` 命令

在 `package.json` 增加 `gen` 命令如下：

```json
{
  "scripts": {
    "gen-request": "gen-request"
  }
}
```

4. 生成 request 代码

```js
yarn gen-request
或
npx gen-request
```

## 生成文件说明

```bash
|-- common.d.ts  # 公共的类型定义
|-- types.d.ts  # 导出 types 目录下所有类型定义
└-- types #  类型目录
  |-- user.d.ts # OssController 对应的接口类型定义
| └-- oss.d.ts #  UserController 对应的接口的类型定义
└-- apis # 生成的接口目录
  |-- user.ts # UserController 对应的接口
  └-- oss.ts # OssController 对应的接口
```

## API

| 属性           | 说明                  | 类型           | 是否必填 | 默认值    |
| -------------- | --------------------- | -------------- | -------- | --------- | --- |
| openapi        | 项目配置              | string         | OpenAPI  | 必填      | -   |
| outputDir      | 输出目录              | string         | 必填     | -         |
| axiosFilePath  | 自定义 axios 文件     | string         | 否       | `'axios'` |
| resolver       | 自定义解析逻辑        | `ResolverType` | 否       | -         |
| bannerComment  | 顶部注释              | string         | 否       |           |
| prettierConfig | prettier 配置文件路径 | string         | 否       | -         |

### middleman

必填参数。

- openapi: openapi 数据 或 openapi 文件地址 或 openapi http 地址

### outputDir

输出目录，一般指向前端项目的 `src/api` 文件，可以使用绝对路径，也可以使用相对路径。

### axiosFilePath

一般情况下我们在前端项目中都会对 axios 进行自定义封装，请求接口也是用的我们封装后的 axios，此配置项就是为了满足此定制化的能力，它分两种配置方式：

- 绝对路径：如果使用了 `path.join(__dirname, xxx)` 形式，最终会通过计算 outputDir 和 axiosFilePath 得出相对目录；
- 相对路径：如果填的是 `../../utils/request` 这样的相对路径，则不会做任何处理，它的含义是指相对于生成后的文件的路径。

还有一点需要注意的是，必须使用 `export default` 去导出自定义的 axios，因为最终生成的效果为：

```js
import request from '../../utils/request';
```

如果不填，则默认是使用 `axios` 库。

### bannerComment

生成文件顶部的说明内容，默认为：

```js
/* eslint-disable */
// @ts-nocheck
/**
 * 此文件由 json-schema-to-request 生成，请不要手动修改！
 * 如果有修改需求，请修改源文件，然后重新生成。
 */\n\n
```

### prettierConfig

prettier 配置文件路径，本库在生成完内容后会用 prettier 进行一次代码格式化，考虑到每个项目的格式化配置不太一样，所以提供了此配置，用来指向前端 prettier 的配置文件。

### resolver

考虑到各种项目的特殊场景，我们提供了个性化的定制能力，具体有：

```ts
export interface ResolverType {
  // 文件名
  fileName?: (api: Api) => string;
  url?: (api: Api) => string;
  method?: (api: Api) => string;
  // 函数名
  fnName?: (api: Api) => string;
  // 评论
  fnComment?: (api: Api) => string | undefined;
  params?: ResolverPromiseFn;
  query?: ResolverPromiseFn;
  cookie?: ResolverPromiseFn;
  header?: ResolverPromiseFn;
  body?: ResolverPromiseFn;
  response?: ResolverPromiseFn;
}
```

例如我们想要定制化 `fileName` 也就是输出文件的名称，我们可以这样写：

```js
{
  resolver: {
    fileName: ({ tags }) => tags[0] + 'Api';
  }
}
```

假如数据为：

```json
{
  "/user/logout": {
    "get": {
      "tags": ["user"],
      "summary": "Logs out current logged in user session",
      "description": "",
      "operationId": "logoutUser",
      "responses": {
        "default": {
          "description": "successful operation"
        }
      }
    }
  }
}
```

最后生成的文件名字就是 `userApi.ts` 和 `userApi.d.ts`。
