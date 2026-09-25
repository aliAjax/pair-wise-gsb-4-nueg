// 许可证分析领域模型：规则层与展示层共用的类型定义。

/** 分发方式：风险结论随分发方式变化 */
export type Distribution = 'open' | 'closed';

/** 许可证族别：判定规则按族别维护 */
export type LicenseFamily =
  | 'permissive' // 宽松许可（MIT / Apache / BSD / ISC / CC0）
  | 'weak-copyleft' // 弱 copyleft（LGPL / MPL）
  | 'strong-copyleft' // 强 copyleft（GPL / AGPL / CC-BY-SA）
  | 'attribution' // 署名类许可（CC-BY）
  | 'proprietary' // 专有 / 商业许可
  | 'unknown'; // 未识别，需要补录

/** 风险等级：放行 / 提醒复核 / 高风险 / 待补录 */
export type RiskLevel = 'pass' | 'review' | 'risk' | 'unknown';

/** 一条依赖清单记录；licenseId 为 null 表示许可证未知，需要补录 */
export interface Dependency {
  id: string;
  name: string;
  version: string;
  licenseId: string | null;
}

/** 许可证元数据（判定依据的事实部分） */
export interface LicenseSpec {
  /** 规范标识（SPDX 风格） */
  id: string;
  /** 许可证全名 */
  name: string;
  family: LicenseFamily;
  /** 清单导入时可接受的其他写法（小写匹配） */
  aliases?: string[];
  /** 许可证说明 */
  description: string;
  /** 关键条款，展示与复核时使用 */
  obligations: string[];
}

/** 某个分发方式下的判定结论与理由 */
export interface Verdict {
  risk: Exclude<RiskLevel, 'unknown'>;
  reason: string;
}

/** 单条依赖的完整分析结果 */
export interface AnalysisResult {
  dep: Dependency;
  license: LicenseSpec;
  risk: RiskLevel;
  reason: string;
}
