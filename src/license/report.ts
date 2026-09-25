// Markdown 报告导出层：基于分析结论生成报告文本，与界面渲染解耦。

import type { Distribution, LicenseFinding, RiskLevel } from './rules';
import { RISK_LABELS } from './rules';

export const DISTRIBUTION_LABEL: Record<Distribution, string> = {
  open: '开源分发',
  closed: '闭源分发',
};

function escapeCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

export interface ReportOptions {
  distribution: Distribution;
  generatedAt: Date;
}

export function buildMarkdownReport(findings: LicenseFinding[], options: ReportOptions): string {
  const { distribution, generatedAt } = options;
  const counts: Record<RiskLevel, number> = { pass: 0, review: 0, risk: 0, unknown: 0 };
  for (const finding of findings) counts[finding.risk] += 1;

  const lines: string[] = [
    '# License Lens · 依赖许可证分析报告',
    '',
    `- 生成时间：${generatedAt.toLocaleString('zh-CN')}`,
    `- 分发方式：${DISTRIBUTION_LABEL[distribution]}`,
    `- 依赖总数：${findings.length}（放行 ${counts.pass} · 提醒复核 ${counts.review} · 高风险 ${counts.risk} · 待补录 ${counts.unknown}）`,
    '',
    '## 结论汇总',
    '',
    '| 依赖 | 版本 | 许可证 | 风险结论 | 分发方式 |',
    '| --- | --- | --- | --- | --- |',
    ...findings.map(
      f =>
        `| ${escapeCell(f.name)} | ${escapeCell(f.version)} | ${escapeCell(f.family)}${f.license && f.family !== f.license ? ` (${escapeCell(f.license)})` : ''} | ${RISK_LABELS[f.risk]} | ${DISTRIBUTION_LABEL[distribution]} |`,
    ),
    '',
    '## 判定依据与理由',
    '',
    ...findings.flatMap(f => [
      `### ${f.name}@${f.version} — ${f.family} · ${RISK_LABELS[f.risk]}`,
      '',
      `- **许可证**：${f.license || '（未填写）'}`,
      `- **依据说明**：${f.basis}`,
      `- **判定理由**：${f.reason}`,
      ...(f.needsSupplement
        ? ['- **待办**：请补录该依赖的标准许可证标识（SPDX）或许可证来源，再重新分析。']
        : []),
      '',
    ]),
    '> 本报告由工具依据内置许可证规则自动生成，仅供初步筛查；正式发布前请由法务或合规负责人复核。',
    '',
  ];

  return lines.join('\n');
}
