import type { LicenseFamily, LicenseSpec } from './types';

// 许可证目录：每种许可证的族别与关键条款集中维护。
// 新增许可证只需在此追加一条，并在 aliases 中登记清单里的常见写法。
export const LICENSE_CATALOG: LicenseSpec[] = [
  {
    id: 'MIT',
    name: 'MIT License',
    family: 'permissive',
    aliases: ['mit license', 'the mit license', 'expat', 'mit/x11'],
    description: '宽松型开源许可证，允许商业使用、修改与再分发。',
    obligations: ['保留版权声明', '保留 MIT 许可证文本'],
  },
  {
    id: 'Apache-2.0',
    name: 'Apache License 2.0',
    family: 'permissive',
    aliases: ['apache', 'apache 2', 'apache2', 'apache-2', 'apache license 2.0', 'apache software license'],
    description: '宽松型开源许可证，含明确的专利授权条款。',
    obligations: ['保留版权声明与许可证文本', '声明所做修改', '保留 NOTICE 文件内容'],
  },
  {
    id: 'BSD-2-Clause',
    name: 'BSD 2-Clause License',
    family: 'permissive',
    aliases: ['bsd', 'bsd-2', 'bsd2', 'bsd 2-clause', 'freebsd', 'simplified bsd'],
    description: '宽松型开源许可证，两条款版本，署名后可自由分发。',
    obligations: ['保留版权声明', '保留免责声明'],
  },
  {
    id: 'BSD-3-Clause',
    family: 'permissive',
    name: 'BSD 3-Clause License',
    aliases: ['bsd-3', 'bsd3', 'bsd 3-clause', 'new bsd', 'modified bsd'],
    description: '宽松型开源许可证，增加了禁止以项目名义背书的条款。',
    obligations: ['保留版权声明', '保留免责声明', '未经许可不得用原作者名义背书'],
  },
  {
    id: 'ISC',
    name: 'ISC License',
    family: 'permissive',
    aliases: ['isc license'],
    description: '功能上与 MIT 等同的宽松型许可证。',
    obligations: ['保留版权声明', '保留许可证文本'],
  },
  {
    id: 'CC0-1.0',
    name: 'Creative Commons Zero v1.0 Universal',
    family: 'permissive',
    aliases: ['cc0', 'cc0-1', 'public domain'],
    description: '放弃尽可能多的权利，等同公有领域贡献。',
    obligations: ['无强制义务，建议保留来源声明'],
  },
  {
    id: 'LGPL-2.1',
    name: 'GNU Lesser General Public License v2.1',
    family: 'weak-copyleft',
    aliases: ['lgpl', 'lgpl-2.1+', 'lgplv2.1'],
    description: '弱 copyleft：以动态库方式链接且允许用户替换库时可与闭源共存。',
    obligations: ['允许用户替换 LGPL 库版本', '提供库的源码或许诺', '保留声明'],
  },
  {
    id: 'LGPL-3.0',
    name: 'GNU Lesser General Public License v3.0',
    family: 'weak-copyleft',
    aliases: ['lgpl-3', 'lgplv3', 'lgpl-3.0+'],
    description: '弱 copyleft：动态链接并允许替换可兼容闭源，静态链接要求放开目标代码。',
    obligations: ['允许用户替换 LGPL 库版本', '提供库源码或许诺', '保留声明与安装信息'],
  },
  {
    id: 'MPL-2.0',
    name: 'Mozilla Public License 2.0',
    family: 'weak-copyleft',
    aliases: ['mpl', 'mozilla public license'],
    description: '文件级弱 copyleft：修改 MPL 文件需以 MPL 开源，其余文件可保留专有。',
    obligations: ['被修改的 MPL 文件继续以 MPL 公开源码', '保留声明'],
  },
  {
    id: 'GPL-2.0',
    name: 'GNU General Public License v2.0',
    family: 'strong-copyleft',
    aliases: ['gpl', 'gpl2', 'gpl-2', 'gplv2'],
    description: '强 copyleft：衍生作品整体须以 GPL-2.0 发布并提供源码。',
    obligations: ['衍生作品整体以 GPL 发布', '提供完整源码或许诺', '保留声明'],
  },
  {
    id: 'GPL-3.0',
    name: 'GNU General Public License v3.0',
    family: 'strong-copyleft',
    aliases: ['gpl3', 'gpl-3', 'gplv3', 'gnu general public license v3'],
    description: '强 copyleft：衍生作品整体须以 GPL-3.0 发布，并含专利与反规避条款。',
    obligations: ['衍生作品整体以 GPL 发布', '提供完整源码或许诺', '提供安装信息', '保留声明'],
  },
  {
    id: 'AGPL-3.0',
    name: 'GNU Affero General Public License v3.0',
    family: 'strong-copyleft',
    aliases: ['agpl', 'agpl3', 'agpl-3', 'affero gpl'],
    description: '网络版强 copyleft：通过网络提供服务也须向用户开放源码。',
    obligations: ['网络服务也须向用户提供源码', '衍生作品整体以 AGPL 发布', '保留声明'],
  },
  {
    id: 'CC-BY-4.0',
    name: 'Creative Commons Attribution 4.0',
    family: 'attribution',
    aliases: ['cc-by', 'cc by 4.0', 'cc-by 4.0'],
    description: '署名类许可，常见于素材/字体，非为软件代码分发设计。',
    obligations: ['显著署名', '提供许可证链接', '声明所做修改'],
  },
  {
    id: 'CC-BY-SA-4.0',
    name: 'Creative Commons Attribution-ShareAlike 4.0',
    family: 'strong-copyleft',
    aliases: ['cc-by-sa', 'cc by-sa 4.0'],
    description: '署名 + 相同方式共享，衍生内容须以同等许可发布。',
    obligations: ['显著署名', '衍生内容以相同许可（SA）发布'],
  },
  {
    id: 'Proprietary',
    name: 'Proprietary / Commercial License',
    family: 'proprietary',
    aliases: ['commercial', 'all rights reserved', '专有', '商业授权', '私有许可证'],
    description: '专有许可证：使用与再分发以授权协议为准。',
    obligations: ['确认商业授权范围', '确认再分发是否被允许', '保存购买/授权凭证'],
  },
];

/** 未识别许可证的占位描述，待补录时展示 */
export const UNKNOWN_LICENSE: LicenseSpec = {
  id: 'Unknown',
  name: '未识别许可证',
  family: 'unknown',
  description: '清单中未提供或许可证标识无法识别，需要人工补录后才能给出结论。',
  obligations: ['在原始清单或包仓库中核实许可证', '补录规范的 SPDX 标识'],
};

/** 小写标识 / 别名 -> 规范标识 */
const ALIAS_INDEX: Map<string, string> = new Map(
  LICENSE_CATALOG.flatMap((spec) =>
    [spec.id, spec.name, ...(spec.aliases ?? [])].map((token) => [token.toLowerCase(), spec.id]),
  ),
);

/**
 * 将清单中的自由写法归一化为目录中的规范许可证标识；
 * 无法识别时返回 null，由分析流程标记为“待补录”。
 */
export function normalizeLicense(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const token = raw.trim().toLowerCase().replace(/_/g, '-');
  if (!token || token === '-' || token === 'none' || token === 'n/a') return null;
  const direct = ALIAS_INDEX.get(token);
  if (direct) return direct;
  // 兼容 "(MIT)"、"MIT OR Apache-2.0" 之类的括号/复合写法：取首个可识别标识
  const first = token.match(/[\w.+-]+/)?.[0];
  return (first && ALIAS_INDEX.get(first)) || null;
}

export function getLicenseSpec(licenseId: string | null): LicenseSpec {
  if (!licenseId) return UNKNOWN_LICENSE;
  return LICENSE_CATALOG.find((s) => s.id === licenseId) ?? UNKNOWN_LICENSE;
}

/** 手动添加 / 待补录下拉可选的许可证（目录顺序） */
export const SELECTABLE_LICENSES: { id: string; label: string }[] = [
  ...LICENSE_CATALOG.map((s) => ({ id: s.id, label: s.id })),
];

export const FAMILY_LABEL: Record<LicenseFamily, string> = {
  permissive: '宽松许可',
  'weak-copyleft': '弱 Copyleft',
  'strong-copyleft': '强 Copyleft',
  attribution: '署名类',
  proprietary: '专有许可',
  unknown: '未知',
};
