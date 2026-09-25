import { FAMILY_LABEL } from './catalog';
import type { AnalysisResult, Distribution, RiskLevel } from './types';

// Markdown 报告生成：报告字段与风险文案在此维护，与页面展示互不影响。

export const RISK_LABEL: Record<RiskLevel, string> = {
  pass: '兼容通过',
  review: '提醒复核',
  risk: '高风险',
  unknown: '待补录',
};

export const DISTRIBUTION_LABEL: Record<Distribution, string> = {
  open: '开源分发',
  closed: '闭源分发',
};

function count(results: AnalysisResult[], risk: RiskLevel): number {
  return results.filter((r) => r.risk === risk).length;
}

export function buildReport(results: AnalysisResult[], distribution: Distribution): string {
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;

  const lines: string[] = [
    '# License Lens 依赖许可证分析报告',
    '',
    `- 分析日期：${date}`,
    `- 分发方式：**${DISTRIBUTION_LABEL[distribution]}**`,
    `- 依赖总数：${results.length}`,
    `- 兼容通过：${count(results, 'pass')} ｜ 提醒复核：${count(results, 'review')} ｜ 高风险：${count(
      results,
      'risk',
    )} ｜ 待补录：${count(results, 'unknown')}`,
    '',
    '## 分析明细',
    '',
    '| 依赖 | 版本 | 许可证 | 风险 | 分发方式 | 判定理由 |',
    '| --- | --- | --- | --- | --- | --- |',
    ...results.map(
      (r) =>
        `| ${r.dep.name} | ${r.dep.version} | ${r.license.id} | ${RISK_LABEL[r.risk]} | ${
          DISTRIBUTION_LABEL[distribution]
        } | ${r.reason} |`,
    ),
  ];

  const unknowns = results.filter((r) => r.risk === 'unknown');
  if (unknowns.length > 0) {
    lines.push(
      '',
      '## 待补录许可证',
      '',
      '以下依赖缺少可识别的许可证标识，必须补录后重新分析：',
      '',
      ...unknowns.map((r) => `- ${r.dep.name}@${r.dep.version}`),
    );
  }

  lines.push(
    '',
    '## 判定依据说明',
    '',
    '- **兼容通过（MIT / Apache / BSD / ISC / CC0 等宽松许可）**：保留版权声明与许可证文本后可随作品分发。',
    '- **提醒复核（GPL 等强 copyleft 用于开源分发，LGPL/MPL、CC-BY 等）**：分发前需核对 copyleft 义务、链接方式或署名义务。',
    `- **高风险（强 copyleft 用于${
      distribution === 'closed' ? '闭源' : '开源'
    }分发，或专有许可冲突）**：许可证要求与当前分发方式冲突，不得直接分发，须移除、替换或取得授权。`,
    '- **待补录**：许可证标识缺失或无法识别，无判定依据，需人工补录。',
  );

  const byFamily = new Map<string, number>();
  for (const r of results) {
    byFamily.set(r.license.id, (byFamily.get(r.license.id) ?? 0) + 1);
  }
  lines.push(
    '',
    '## 许可证清单与关键条款',
    '',
    '| 许可证 | 类别 | 数量 | 关键条款 |',
    '| --- | --- | --- | --- |',
    ...[...byFamily.entries()].map(([id, n]) => {
      const spec = results.find((r) => r.license.id === id)!.license;
      return `| ${id} | ${FAMILY_LABEL[spec.family]} | ${n} | ${spec.obligations.join('；')} |`;
    }),
    '',
    '---',
    '',
    '> 本报告由 License Lens 按清单中的许可证标识自动生成，仅供内部合规参考，不构成法律意见。分发前请由法务复核高风险与待复核条目。',
    '',
  );

  return lines.join('\n');
}

export function downloadReport(markdown: string): void {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `license-report-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
