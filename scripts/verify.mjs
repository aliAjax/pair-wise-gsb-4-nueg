import { analyzeLicenses, evaluateLicense } from '../src/license/rules.ts';
import { parseManifest } from '../src/license/parse.ts';
import { buildMarkdownReport } from '../src/license/report.ts';

let failures = 0;
function assert(cond, msg) {
  if (cond) { console.log('  ✓', msg); }
  else { console.error('  ✗', msg); failures++; }
}
function riskOf(text, license, dist) {
  return evaluateLicense({ id: 'x', name: text, version: '1.0.0', license }, dist).risk;
}

console.log('— 规则判定（开源）—');
for (const lic of ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'BSD-2-Clause', 'ISC']) {
  assert(riskOf('p', lic, 'open') === 'pass', `${lic} 开源放行`);
}
for (const lic of ['MIT', 'Apache-2.0', 'BSD-3-Clause']) {
  assert(riskOf('p', lic, 'closed') === 'pass', `${lic} 闭源放行`);
}
for (const lic of ['GPL-2.0', 'GPL-3.0', 'gpl-3.0']) {
  assert(riskOf('p', lic, 'open') === 'review', `${lic} 开源提醒复核`);
  assert(riskOf('p', lic, 'closed') === 'risk', `${lic} 闭源高风险`);
}
assert(riskOf('p', 'AGPL-3.0', 'closed') === 'risk', 'AGPL 闭源高风险');
assert(riskOf('p', 'LGPL-2.1-only', 'open') === 'pass', 'LGPL 开源放行');
assert(riskOf('p', 'LGPL-2.1-only', 'closed') === 'review', 'LGPL 闭源复核');
assert(riskOf('p', '', 'open') === 'unknown', '空许可证 待补录');
assert(riskOf('p', 'Some-Weird-License', 'closed') === 'unknown', '未知许可证 待补录');
assert(evaluateLicense({ id: 'x', name: 'p', version: '1', license: 'GPL-3.0' }, 'closed').needsSupplement === false, 'GPL 不需要补录');
assert(evaluateLicense({ id: 'x', name: 'p', version: '1', license: '' }, 'open').needsSupplement === true, '未知 needsSupplement=true');

console.log('— 文本解析 —');
const r1 = parseManifest('react@18.3.1 MIT\n@scope/lib@2.0.0 Apache-2.0\nmystery@0.1.0\nlodash@4.17.21 MIT\nlodash@4.17.21 MIT');
assert(r1.entries.length === 4, `去重后 4 条（实际 ${r1.entries.length}）`);;
const react = r1.entries.find(e => e.name === 'react');
assert(react?.version === '18.3.1' && react.license === 'MIT', '普通包名解析');
const scoped = r1.entries.find(e => e.name === '@scope/lib');
assert(scoped?.version === '2.0.0' && scoped.license === 'Apache-2.0', 'scoped 包名解析');
const mystery = r1.entries.find(e => e.name === 'mystery');
assert(mystery?.version === '0.1.0' && mystery.license === '', '无许可证条目');

const r2 = parseManifest('foo,1.2.3,MIT\nbar\t2.0.0\tGPL-3.0');
assert(r2.entries.length === 2 && r2.entries[0].name === 'foo' && r2.entries[1].license === 'GPL-3.0', 'CSV/TSV 行解析');

console.log('— JSON 解析 —');
const pkg = parseManifest(JSON.stringify({
  name: 'my-app', version: '1.0.0', license: 'MIT',
  dependencies: { react: '^18.3.1', lib: '2.0.0' },
}));
assert(pkg.entries.length === 2 && !pkg.entries.some(e => e.name === 'my-app'), 'package.json dependencies，不含项目自身');
assert(pkg.entries.find(e => e.name === 'react')?.version === '18.3.1', '版本去除 ^ 前缀');

const checker = parseManifest(JSON.stringify({
  'react@18.3.1': { licenses: 'MIT', repository: 'x' },
  '@scope/lib@2.0.0': { licenses: 'Apache-2.0' },
}));
assert(checker.entries.length === 2, `license-checker JSON 2 条（实际 ${checker.entries.length}）`);
assert(checker.entries.find(e => e.name === '@scope/lib')?.version === '2.0.0', 'checker scoped 键解析');

const lock = parseManifest(JSON.stringify({
  name: 'app', lockfileVersion: 3,
  packages: {
    '': { name: 'app', version: '1.0.0' },
    'node_modules/react': { version: '18.3.1', license: 'MIT' },
    'node_modules/@scope/lib': { version: '2.0.0', license: 'MIT' },
  },
}));
assert(lock.entries.length === 2, `package-lock v3 packages 2 条（实际 ${lock.entries.length}）`);

const arr = parseManifest(JSON.stringify(['a@1.0.0 MIT', 'b@2.0.0 GPL-3.0']));
assert(arr.entries.length === 2, 'JSON 字符串数组解析');

console.log('— 空清单 —');
assert(parseManifest('').entries.length === 0, '空输入解析为 0 条');

console.log('— 报告 —');
const findings = analyzeLicenses(r1.entries, 'closed');
const md = buildMarkdownReport(findings, { distribution: 'closed', generatedAt: new Date('2026-09-25T10:00:00Z') });
for (const token of ['# License Lens', '依赖 | 版本 | 许可证 | 风险结论 | 分发方式', '闭源分发', '判定依据', '判定理由', '待补录']) {
  assert(md.includes(token), `报告包含「${token}」`);
}
// r1 中的包：MIT、Apache（闭源放行）、空许可证（待补录），不应出现高风险结论
const riskRows = md.split('\n').filter(line => line.startsWith('|') && line.includes('高风险'));
assert(riskRows.length === 0, '闭源场景下 r1 无高风险条目');
assert(md.includes('mystery-lib') || md.includes('mystery'), '报告包含无许可证依赖');
// GPL 在闭源下必须是高风险
const gplMd = buildMarkdownReport(
  analyzeLicenses([{ id: 'g', name: 'gpl-pkg', version: '1.0.0', license: 'GPL-3.0' }], 'closed'),
  { distribution: 'closed', generatedAt: new Date() },
);
assert(gplMd.split('\n').some(line => line.startsWith('| gpl-pkg') && line.includes('高风险')), 'GPL 闭源报告标高风险');

if (failures) { console.error(`\n${failures} 个断言失败`); process.exit(1); }
console.log('\n全部断言通过');
