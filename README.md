# License Lens

纯前端开源依赖许可证兼容性分析工具。基于 React + Vite + TypeScript。

## 使用

```bash
npm install
npm run dev      # 本地开发
npm run build    # 类型检查 + 生产构建
npm run preview  # 预览构建产物
```

粘贴或上传依赖清单后点击“开始分析”，选择**开源分发 / 闭源分发**，即可查看每个依赖的
风险结论与判定依据；支持手动新增、补录未知许可证、按风险筛选并导出 Markdown 报告。

支持的清单格式：

- 文本行：`名称@版本 许可证`（也兼容逗号 / 制表符分隔的 CSV）
- `package.json` 的 dependencies / devDependencies / peerDependencies
- `package-lock.json`（v2/v3 的 `packages` 结构）
- license-checker 导出的 JSON（键为 `name@version`）

## 风险规则

| 许可证 | 开源分发 | 闭源分发 |
| --- | --- | --- |
| MIT / Apache-2.0 / BSD / ISC / Unlicense | 放行 | 放行 |
| GPL | 提醒复核（Copyleft 兼容性） | 高风险 |
| AGPL | 提醒复核（网络服务条款） | 高风险 |
| LGPL | 开源放行 | 提醒复核（链接方式） |
| MPL-2.0 | 放行 | 提醒复核（文件级隔离） |
| CC-BY | 提醒复核 | 提醒复核 |
| CC-BY-SA / CC-BY-NC | 复核 / 高风险 | 高风险 |
| Proprietary | 提醒复核（核对授权） | 放行（凭授权） |
| 未知 / 未填写 | 待补录 | 待补录 |

## 架构：规则与展示分离

- `src/license/rules.ts` — 许可证规则表与按分发方式的风险判定（纯逻辑）
- `src/license/parse.ts` — 依赖清单解析（文本 / JSON / CSV，纯逻辑）
- `src/license/report.ts` — Markdown 报告生成（纯逻辑）
- `src/components/ImportPanel.tsx` — 导入、上传、手动新增（展示层）
- `src/components/ResultsPanel.tsx` — 筛选、依据说明、补录（展示层）
- `src/App.tsx` — 组合层：新增、筛选、导出共用同一份分析结果

新增或调整许可证规则时只需维护 `src/license/rules.ts` 中的规则表，无需改动展示组件。

## 测试

`scripts/verify.mjs` 覆盖规则判定、清单解析与报告内容：

```bash
./node_modules/.bin/rolldown scripts/verify.mjs --platform=node --format=esm --file=.tmp-verify.mjs \
  && node .tmp-verify.mjs; rm -f .tmp-verify.mjs
```
