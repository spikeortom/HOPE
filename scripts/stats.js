#!/usr/bin/env node

/**
 * 数据统计脚本
 * 生成项目数据的统计信息(行业归并、地区分布、合作关系分布、数据覆盖度)
 *
 * 用法: node scripts/stats.js
 */

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const { groupOf, regionOf } = require('./lib/industry.js');

function tally(items, fn) {
  const t = {};
  for (const it of items) {
    const k = fn(it);
    if (k !== undefined) t[k] = (t[k] || 0) + 1;
  }
  return Object.entries(t).sort((a, b) => b[1] - a[1]);
}

const companiesData = JSON.parse(fs.readFileSync(path.join(dataDir, 'companies.json'), 'utf-8'));
const collabData = JSON.parse(fs.readFileSync(path.join(dataDir, 'collaborations.json'), 'utf-8'));
let laborData = null;
try { laborData = JSON.parse(fs.readFileSync(path.join(dataDir, 'labor-rights.json'), 'utf-8')); } catch { /* 可选 */ }

const companies = companiesData.companies || [];
const rels = collabData.relationships || [];

console.log('📊 HOPE - 数据统计\n' + '='.repeat(50) + '\n');

console.log('🏢 公司统计：');
console.log(`  总计: ${companies.length} 家\n`);

console.log('📂 按行业大类分布：');
for (const [g, n] of tally(companies, c => groupOf(c.industry))) console.log(`  ${g}: ${n} 家`);

console.log('\n🌍 按总部区域：');
for (const [g, n] of tally(companies, c => regionOf(c.location?.hq))) console.log(`  ${g}: ${n} 家`);

console.log('\n' + '='.repeat(50) + '\n');
console.log('🤝 合作关系统计：');
console.log(`  总计: ${rels.length} 条\n`);

console.log('📋 按关系类型：');
const TYPE_LABEL = (collabData.summary?.byType) || {};
for (const [t, n] of tally(rels, r => r.type)) {
  console.log(`  ${t}(${TYPE_LABEL[t] ? TYPE_LABEL[t].split(' - ')[0] : t}): ${n} 条`);
}

console.log('\n🌐 按海外国家/地区(前 15)：');
for (const [c, n] of tally(rels, r => r.overseas?.country).slice(0, 15)) console.log(`  ${c}: ${n} 条`);

console.log('\n🏭 海外布局最多的企业(前 10)：');
for (const [name, n] of tally(rels, r => r.domestic?.name).slice(0, 10)) console.log(`  ${name}: ${n} 条`);

console.log('\n' + '='.repeat(50) + '\n');

const relCompanyIds = new Set(rels.map(r => r.domestic?.id).filter(Boolean));
const noRel = companies.filter(c => !relCompanyIds.has(c.id));
console.log('📈 数据覆盖度：');
console.log(`  有合作关系记录的企业: ${companies.length - noRel.length}/${companies.length} 家`);
console.log(`  暂无合作关系数据的企业: ${noRel.length} 家`);
if (noRel.length > 0 && noRel.length <= 30) {
  console.log(`  (${noRel.map(c => c.name?.zh).join('、')})`);
}

if (laborData) {
  console.log('\n⚖️ 劳动法规与合规数据：');
  console.log(`  法律框架: ${laborData.legalFrameworks?.length || 0} 个`);
  console.log(`  投诉渠道: ${laborData.reportingChannels?.length || 0} 个`);
  console.log(`  合规评级档位: ${laborData.complianceRatings?.length || 0} 档`);
}

console.log('\n' + '='.repeat(50));
console.log('✅ 统计完成');
