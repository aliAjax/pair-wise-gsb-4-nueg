import { getLicenseSpec } from './catalog';
import type {
  AnalysisResult,
  Dependency,
  Distribution,
  LicenseFamily,
  Verdict,
} from './types';

// 判定规则：按“许可证族别 × 分发方式”给出风险等级与理由。
// 规则集中于此，展示层不得自行推导风险结论。
type RuleTable = Record<
  Exclude<LicenseFamily, 'unknown'>,
  { open: Verdict; closed: Verdict }
>;

const RULES: RuleTable = {
  // MIT / Apache / BSD / ISC / CC0：开源、闭源分发均放行
  permissive: {
    open: {
      risk: 'pass',
      reason: '宽松许可证：保留版权声明与许可证文本后，可随开源作品自由分发。',
    },
    closed: {
      risk: 'pass',
      reason: '宽松许可证：保留版权声明与许可证文本后，可随闭源作品分发，无 copyleft 义务。',
    },
  },
  // LGPL / MPL：链接/修改方式影响合规性，两种分发都需复核
  'weak-copyleft': {
    open: {
      risk: 'review',
      reason: '弱 copyleft：开源分发需确认链接方式与修改部分的源码公开义务是否满足。',
    },
    closed: {
      risk: 'review',
      reason: '弱 copyleft：闭源分发须允许用户替换该库（动态链接）或公开修改部分源码，请法务复核集成方式。',
    },
  },
  // GPL / AGPL / CC-BY-SA：开源分发提醒复核，闭源分发高风险
  'strong-copyleft': {
    open: {
      risk: 'review',
      reason: '强 copyleft：以开源方式分发时，衍生作品整体须以该许可证发布，请复核源码与声明义务。',
    },
    closed: {
      risk: 'risk',
      reason: '高风险：强 copyleft 要求衍生作品整体开源，与闭源分发方式冲突，不得直接随闭源产品分发。',
    },
  },
  // CC-BY：素材类署名许可，两种分发都需确认署名方式
  attribution: {
    open: {
      risk: 'review',
      reason: '署名类许可：须在开源作品中显著署名并声明修改，且该许可证并非为代码分发设计，请确认适用范围。',
    },
    closed: {
      risk: 'review',
      reason: '署名类许可：闭源分发仍须显著署名、提供许可证链接并声明修改，请确认素材用途与署名位置。',
    },
  },
  // 专有：开源分发高风险（无法传递自由授权），闭源分发需复核授权
  proprietary: {
    open: {
      risk: 'risk',
      reason: '高风险：专有组件不允许自由再分发，无法满足开源分发对接收方的授权传递，请移除或替换。',
    },
    closed: {
      risk: 'review',
      reason: '闭源分发需复核商业授权范围与再分发条款，确认授权覆盖本产品及交付数量。',
    },
  },
};

/** 对单条依赖做判定；许可证未知时返回 unknown，要求补录 */
export function analyzeDependency(dep: Dependency, distribution: Distribution): AnalysisResult {
  const license = getLicenseSpec(dep.licenseId);
  if (license.family === 'unknown') {
    return {
      dep,
      license,
      risk: 'unknown',
      reason: '许可证未知，缺少判定依据。请核实并补录规范许可证标识后再分析。',
    };
  }
  const verdict = RULES[license.family][distribution];
  return { dep, license, risk: verdict.risk, reason: verdict.reason };
}

export function analyzeAll(deps: Dependency[], distribution: Distribution): AnalysisResult[] {
  return deps.map((d) => analyzeDependency(d, distribution));
}
