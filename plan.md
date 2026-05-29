# ReadMi MiMo Reader 开发计划

## 目标

开发一个 Chrome Manifest V3 浏览器扩展，使用小米 `mimo-v2.5-tts` API 朗读网页正文或用户选中的文本，并在页面上高亮当前朗读内容。

## 核心功能

- 设置页保存小米 MiMo API Key。
- 设置页支持选择 API 类型：
  - 按量计费 API（默认）：`https://api.xiaomimimo.com/v1/chat/completions`
  - Token Plan：`https://token-plan-cn.xiaomimimo.com/v1/chat/completions`
  - 自定义 API 地址：显示自定义 URL 输入框。
- 设置页提供“测试”按钮，用短文本请求 TTS，检查 API Key 和 endpoint 是否可用。
- 使用 Mozilla Readability 抽取网页正文。
- 按段落切分正文并调用 TTS API。
- 播放当前返回的音频，同时预取下一段音频，保证连续朗读。
- 高亮显示页面上当前朗读的段落或选中文本。
- 支持朗读全文、朗读选中、从选中位置开始、朗读下一段、停止朗读、继续朗读。
- 支持固定倍速：`1x`、`1.25x`、`1.5x`、`2x`。
- 点击倍速后立即应用，并持久化为默认值。
- 支持浏览器右键菜单：
  - 朗读全文
  - 停止朗读
  - 继续朗读
  - 朗读下一段
  - 有选中文本时显示“朗读选中”和“从选中位置开始”。
- 使用基于 MiMo 风格生成的 ReadMi 图标，并配置为扩展图标和 popup logo。

## 架构

- `background`
  - 管理朗读队列、播放状态、TTS 请求、预取缓存、右键菜单和 popup 命令。
  - 使用 `AbortController` 取消正在进行的 API 请求。
  - 用户点击“朗读选中”、“从选中处开始”、“停止朗读”、“朗读下一段”时，清除当前播放、取消请求、清空预热内容，再按新状态重新请求音频。
- `content`
  - 使用 Readability 提取正文。
  - 读取 selection 文本。
  - 将选区起点匹配到正文段落。
  - 负责页面高亮和清除高亮。
- `offscreen`
  - 在 MV3 offscreen document 中播放音频。
  - 接收 background 的播放、停止、倍速等命令。
- `popup`
  - 提供朗读控制、倍速、音色、风格选择。
  - API 请求等待时，在 logo 上显示 loading 圆圈。
- `options`
  - 提供 API Key、API 类型、自定义 endpoint 和测试配置。

## API 约定

- 请求方法：`POST`
- 请求体：
  - `model: "mimo-v2.5-tts"`
  - `messages[0] = { role: "user", content: 风格描述 }`
  - `messages[1] = { role: "assistant", content: 带风格标签的朗读文本 }`
  - `audio = { format: "wav", voice: 选中音色 }`
- 请求头：
  - `content-type: application/json`
  - `api-key: <用户保存的 API Key>`
- 响应音频：
  - 读取 `choices[0].message.audio.data`
  - 转为 `data:audio/wav;base64,...` 后播放。

## 默认设置

- API 类型：按量计费 API。
- 音色：`mimo_default`。
- 风格：普通话，新闻播报。
- 倍速：`1x`。
- 预取段数：下一段，即 `PREFETCH_AHEAD = 1`。

## 测试计划

- 单元测试：
  - 配置默认值和 endpoint 解析。
  - 文本切分。
  - TTS 请求体构造。
- 构建测试：
  - `npm run test`
  - `npm run build`
- 手动验收：
  - 未设置 API Key 时提示去设置页。
  - 三种 API 类型保存和测试按钮可用。
  - 自定义 API 地址为空或格式错误时显示提示。
  - 朗读全文能提取正文、分段播放并高亮。
  - 播放当前段时预取下一段。
  - 朗读选中和从选中处开始能取消旧请求并重新播放。
  - 朗读下一段能停止当前音频、取消预热并请求下一段。
  - 停止朗读能清除音频、请求和预热内容。
  - 倍速选择能持久化并应用到后续播放。
  - 右键菜单入口与 popup 控制状态一致。

## 后续可选优化

- 增加错误类型区分，例如鉴权失败、额度不足、网络失败、接口响应格式异常。
- 为 API 测试按钮增加超时控制和更友好的错误提示。
- 支持更多音色和风格配置。
- 支持逐句或更细粒度高亮；当前接口无字级时间戳，因此首版只做段落级高亮。
- 支持把长文章的预取策略做成可配置项。
