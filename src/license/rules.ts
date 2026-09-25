// 许可证判定规则层：只维护规则与判定逻辑，不包含任何界面代码。
// 展示层（components/*）只读取这里的结论进行渲染。

export type Distribution = 'open' | 'closed';
export type RiskLevel = 'pass' | 'review' | 'risk' | 'unknown';

export interface DependencyEntry {
  id: string;
  name: string;
  version: string;
  /** 用户原始填写/解析到的许可证文本，可能为空或无法识别 */
  license: string;
}

export interface LicenseFinding extends DependencyEntry {
  /** 归一化后的许可证家族（SPDX 风格），无法识别时为“未知” */
  family: string;
  risk: RiskLevel;
  /** 该许可证本身的义务说明（依据） */
  basis: string;
  /** 结合分发方式给出的判定理由 */
  reason: string;
  /** 许可证未知，需要补录后才能给出结论 */
  needsSupplement: boolean;
}

interface LicenseRule {
  id: string;
  /** 归一化许可证名称，用于报告与界面展示 */
  label: string;
  /** 对原始许可证字符串的识别规则 */
  match: RegExp;
  /** 开源分发下的结论 */
  open: RiskLevel;
  /** 闭源分发下的结论 */
  closed: RiskLevel;
  /** 许可证义务依据 */
  basis: string;
  reason: Record<Distribution, string>;
}

// 注意顺序：AGPL / LGPL / CC 的特殊变体需在通用 GPL、CC-BY 之前匹配。
const RULES: LicenseRule[] = [
  {
    id: 'agpl',
    label: 'AGPL-3.0',
    match: /agpl|affero general public/,
    open: 'review',
    closed: 'risk',
    basis: 'AGPL 是强 Copyleft 许可证，除分发外，通过网络提供服务同样触发源代码提供义务，衍生作品须以 AGPL 开放。',
    reason: {
      open: '即便是开源分发，网络服务也会触发 AGPL 源码提供义务，请确认整体许可证兼容并复核部署方式。',
      closed: 'AGPL 的强 Copyleft（含网络使用条款）与闭源分发直接冲突，无法闭源交付，判定高风险。',
    },
  },
  {
    id: 'lgpl',
    label: 'LGPL',
    match: /lgpl|lesser general public/,
    open: 'pass',
    closed: 'review',
    basis: 'LGPL 是弱 Copyleft 许可证：以动态链接方式调用可用于闭源产品；静态链接或修改库本身则须提供对应源码。',
    reason: {
      open: '开源分发与 LGPL 兼容，保留版权与许可声明即可放行。',
      closed: '闭源产品必须采用动态链接且不得修改/静态链接该库，请复核链接方式与工程合规性。',
    },
  },
  {
    id: 'gpl',
    label: 'GPL',
    match: /gpl|gnu general public license/,
    open: 'review',
    closed: 'risk',
    basis: 'GPL 是强 Copyleft 许可证：分发基于 GPL 的衍生作品时，必须以相同许可证提供完整源代码，不得附加额外限制。',
    reason: {
      open: '强 Copyleft 义务：开源分发需确认整体作品许可证与 GPL 兼容、随附完整源码并保留声明，发布前请复核。',
      closed: '强 Copyleft 与闭源分发冲突：衍生作品必须以 GPL 开放源码，无法满足闭源交付要求，判定高风险。',
    },
  },
  {
    id: 'cc-nc',
    label: 'CC-BY-NC',
    match: /cc-?by-?nc|non-?commercial|非商业/,
    open: 'risk',
    closed: 'risk',
    basis: 'CC-BY-NC 含“非商业使用”限制，且 Creative Commons 系列并非面向软件的许可证。',
    reason: {
      open: '非商业条款可能限制项目的商业化与再分发，开源分发亦不能消除该限制，判定高风险，请更换组件或取得授权。',
      closed: '非商业条款与商业闭源分发冲突，判定高风险，必须取得商业授权或替换该依赖。',
    },
  },
  {
    id: 'cc-sa',
    label: 'CC-BY-SA',
    match: /cc-?by-?sa|share-?alike/,
    open: 'review',
    closed: 'risk',
    basis: 'CC-BY-SA 的“相同方式共享”要求衍生内容以相同许可证发布，具有类 Copyleft 效果，且并非软件许可证。',
    reason: {
      open: '相同方式共享条款会约束衍生作品的许可证，请确认与项目其他部分兼容并复核署名方式。',
      closed: '相同方式共享要求衍生作品开放许可，与闭源分发冲突，判定高风险。',
    },
  },
  {
    id: 'cc-by',
    label: 'CC-BY-4.0',
    match: /cc-?by|creative commons/,
    open: 'review',
    closed: 'review',
    basis: 'CC-BY 系列主要面向文档、字体、素材等内容作品而非软件，核心义务是按要求署名。',
    reason: {
      open: '需按要求署名，并确认该许可证适用于软件分发场景，建议复核使用范围。',
      closed: '需按要求署名，并确认该许可证适用于闭源软件分发场景，建议复核使用范围。',
    },
  },
  {
    id: 'mpl',
    label: 'MPL-2.0',
    match: /\bmpl\b|mozilla public/,
    open: 'pass',
    closed: 'review',
    basis: 'MPL-2.0 是文件级 Copyleft：被修改的 MPL 许可文件本身须继续以 MPL 开源，与之分离的自有文件可闭源。',
    reason: {
      open: '开源分发与 MPL-2.0 文件级 Copyleft 兼容，保留声明即可放行。',
      closed: '需确保被修改的 MPL 文件源码公开、其余代码通过清晰的文件边界隔离，请复核涉及文件。',
    },
  },
  {
    id: 'apache',
    label: 'Apache-2.0',
    match: /apache/,
    open: 'pass',
    closed: 'pass',
    basis: 'Apache-2.0 是宽松型许可证，含明确专利授权；要求保留版权与许可声明、保留 NOTICE 文件（如有）并注明对文件的修改。',
    reason: {
      open: '宽松许可，与开源分发兼容，保留声明/NOTICE 并注明修改文件即可放行。',
      closed: '宽松许可，允许闭源商用分发，保留声明/NOTICE 并注明修改文件即可放行。',
    },
  },
  {
    id: 'mit',
    label: 'MIT',
    match: /(^|[^a-z])mit([^a-z]|$)/,
    open: 'pass',
    closed: 'pass',
    basis: 'MIT 是宽松型许可证，允许使用、修改、再分发与商用，唯一义务是在分发时保留版权声明与许可声明。',
    reason: {
      open: '宽松许可，与开源分发兼容，随分发保留版权与许可声明即可放行。',
      closed: '宽松许可，允许闭源商用分发，随产品保留版权与许可声明即可放行。',
    },
  },
  {
    id: 'bsd',
    label: 'BSD',
    match: /bsd/,
    open: 'pass',
    closed: 'pass',
    basis: 'BSD-2/3-Clause 是宽松型许可证，要求保留版权与免责声明；三条款另禁止以版权所有者名义为衍生品宣传。',
    reason: {
      open: '宽松许可，与开源分发兼容，保留版权与免责声明即可放行。',
      closed: '宽松许可，允许闭源商用分发，保留版权与免责声明（三条款另需遵守署名限制）即可放行。',
    },
  },
  {
    id: 'isc',
    label: 'ISC',
    match: /(^|[^a-z])isc([^a-z]|$)/,
    open: 'pass',
    closed: 'pass',
    basis: 'ISC 是与 MIT 等效的宽松型许可证，允许使用、修改与再分发，仅需保留版权与许可声明。',
    reason: {
      open: '宽松许可，与开源分发兼容，保留声明即可放行。',
      closed: '宽松许可，允许闭源商用分发，保留声明即可放行。',
    },
  },
  {
    id: 'unlicense',
    label: 'Unlicense',
    match: /unlicense|public domain/,
    open: 'pass',
    closed: 'pass',
    basis: 'The Unlicense 将软件贡献至公有领域（或等效授权），几乎不设使用与分发限制。',
    reason: {
      open: '公有领域等效许可，无 Copyleft 义务，可放行。',
      closed: '公有领域等效许可，允许闭源商用，可放行。',
    },
  },
  {
    id: 'proprietary',
    label: 'Proprietary',
    match: /proprietary|commercial|专有|商业许可/,
    open: 'review',
    closed: 'pass',
    basis: '专有/商业许可证的使用、复制与再分发权利以具体商业合同为准，需核对授权范围、有效期与交付条款。',
    reason: {
      open: '在开源分发中再分发专有组件须确认合同是否授权，避免与开源声明冲突，请凭授权协议复核。',
      closed: '闭源产品集成已获授权的专有组件通常合规，请保留采购合同/授权凭证并核对授权范围。',
    },
  },
];

const UNKNOWN_RULE: LicenseRule = {
  id: 'unknown',
  label: '未知',
  match: /$^/,
  open: 'unknown',
  closed: 'unknown',
  basis: '未识别到有效的许可证信息（如 SPDX 标识、package.json 的 license 字段或仓库 LICENSE 文件）。',
  reason: {
    open: '无法判断该依赖的合规义务，请补录标准许可证标识或许可证来源后重新分析，暂不允许在未确认情况下分发。',
    closed: '无法判断该依赖的合规义务，请补录标准许可证标识或许可证来源后重新分析，暂不允许在未确认情况下分发。',
  },
};

/** 手动添加 / 补录时可选择的许可证清单 */
export const LICENSE_OPTIONS: string[] = [
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'GPL-2.0',
  'GPL-3.0',
  'LGPL-2.1-only',
  'AGPL-3.0',
  'MPL-2.0',
  'CC-BY-4.0',
  'CC-BY-SA-4.0',
  'Proprietary',
  'Unknown',
];

export const RISK_LABELS: Record<RiskLevel, string> = {
  pass: '放行',
  review: '提醒复核',
  risk: '高风险',
  unknown: '待补录',
};

function normalizeLicense(raw: string): string {
  return raw.toLowerCase().replace(/_/g, '-').replace(/\s+/g, ' ').trim();
}

function findRule(rawLicense: string): LicenseRule {
  const normalized = normalizeLicense(rawLicense);
  if (!normalized || /^(unknown|none|n\/a|未知|未知)$/.test(normalized)) return UNKNOWN_RULE;
  return RULES.find(rule => rule.match.test(normalized)) ?? UNKNOWN_RULE;
}

export function evaluateLicense(entry: DependencyEntry, distribution: Distribution): LicenseFinding {
  const rule = findRule(entry.license);
  const risk = distribution === 'open' ? rule.open : rule.closed;
  return {
    ...entry,
    family: rule.label,
    risk,
    basis: rule.basis,
    reason: rule.reason[distribution],
    needsSupplement: risk === 'unknown',
  };
}

export function analyzeLicenses(entries: DependencyEntry[], distribution: Distribution): LicenseFinding[] {
  return entries.map(entry => evaluateLicense(entry, distribution));
}
