# ReadMi MiMo Reader

Chrome Manifest V3 扩展，使用小米 `mimo-v2.5-tts` 朗读网页正文或选中文本。

## 使用

```bash
npm install
npm run build
```

然后在 Chrome 打开 `chrome://extensions`，启用开发者模式，选择“加载已解压的扩展程序”，加载本仓库的 `dist` 目录。

首次使用前，在扩展设置页保存小米 MiMo API Key。

## 功能

- 朗读网页主要正文
- 朗读选中文本
- 从选中文本所在位置开始朗读
- 停止朗读后继续朗读
- 当前朗读片段页面高亮
- 固定倍速：`1x`、`1.25x`、`1.5x`、`2x`
- 音色和风格持久化为默认配置
- 浏览器右键菜单入口
