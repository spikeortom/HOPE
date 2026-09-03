#!/usr/bin/env node

/**
 * 数据验证脚本
 * 验证 JSON 数据文件的格式、完整性以及文件之间的交叉引用一致性
 *
 * 用法: node scripts/validate.js
 * 退出码: 0 = 通过(可有警告), 1 = 存在错误
 */

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');

let errors = 0;
let warnings = 0;

const err = (file, msg) => { console.log(`  ❌ [${file}] ${msg}`); errors++; };
const warn = (file, msg) => { console.log(`  ⚠️  [${file}] ${msg}`); warnings++; };
const ok = (msg) => console.log(`  ✅ ${msg}`);

function loadJSON(file) {
  const filePath = path.join(dataDir, file);
  if (!fs.existsSync(filePath)) {
    err(file, '文件不存在');
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    err(file, `JSON 解析失败: ${e.message}`);
    return null;
  }
}

const REL_TYPES = [
  'supplier-customer',
  'overseas-factory',
  'joint-venture',
  'acquisition',
  'licensing',
  'outsourcing',
  'overseas-office'
];

console.log('🔍 开始验证数据文件...\n');

/* ---------------- companies.json ---------------- */
const companiesData = loadJSON('companies.json');
const companyIds = new Set();
const companyNameToId = new Map();

if (companiesData) {
  console.log('📄 验证 companies.json');

  if (!companiesData.metadata) warn('companies.json', '缺少 metadata 字段');
  if (!Array.isArray(companiesData.companies)) {
    err('companies.json', '缺少 companies 数组');
  } else {
    const companies = companiesData.companies;
    ok(`包含 ${companies.length} 家公司`);

    for (const c of companies) {
      const label = c.name?.zh || JSON.stringify(c).slice(0, 40);
      if (!c.id) err('companies.json', `公司缺少 id: ${label}`);
      else if (companyIds.has(c.id)) err('companies.json', `公司 id 重复: ${c.id}`);
      else companyIds.add(c.id);

      if (!c.name?.zh) err('companies.json', `公司缺少 name.zh: ${c.id || label}`);
      if (c.name?.zh && companyNameToId.has(c.name.zh)) {
        err('companies.json', `公司中文名重复: ${c.name.zh}`);
      } else if (c.name?.zh) {
        companyNameToId.set(c.name.zh, c.id);
      }
      if (!c.industry) warn('companies.json', `公司缺少 industry: ${label}`);
      if (!c.location?.hq) warn('companies.json', `公司缺少 location.hq: ${label}`);
      if (c.ticker === undefined) warn('companies.json', `公司缺少 ticker: ${label}`);
      if (c.partners !== undefined && !Array.isArray(c.partners)) {
        err('companies.json', `partners 不是数组: ${label}`);
      } else if (Array.isArray(c.partners)) {
        for (const p of c.partners) {
          if (!p.name || !p.country || !p.type) {
            warn('companies.json', `partners 条目字段不全(需 name/country/type): ${label}`);
            break;
          }
        }
      }
    }
  }
  console.log('');
}

/* ---------------- collaborations.json ---------------- */
const collabData = loadJSON('collaborations.json');
let relationshipCount = 0;

if (collabData) {
  console.log('📄 验证 collaborations.json');

  if (!collabData.metadata) warn('collaborations.json', '缺少 metadata 字段');
  if (!Array.isArray(collabData.relationships)) {
    err('collaborations.json', '缺少 relationships 数组');
  } else {
    const rels = collabData.relationships;
    relationshipCount = rels.length;
    ok(`包含 ${rels.length} 条合作关系`);

    const relIds = new Set();
    const typesPresent = new Set();

    for (const r of rels) {
      const label = r.id || '(无 id)';
      if (!r.id) err('collaborations.json', '关系缺少 id');
      else if (relIds.has(r.id)) err('collaborations.json', `关系 id 重复: ${r.id}`);
      else relIds.add(r.id);

      if (!REL_TYPES.includes(r.type)) {
        err('collaborations.json', `关系 ${label} 的 type 非法: ${r.type}`);
      } else {
        typesPresent.add(r.type);
      }

      // 交叉引用: domestic.id 必须存在于 companies.json,且名称一致
      if (!r.domestic?.id) {
        err('collaborations.json', `关系 ${label} 缺少 domestic.id`);
      } else {
        if (!companyIds.has(r.domestic.id)) {
          err('collaborations.json', `关系 ${label} 的 domestic.id 不在 companies.json 中: ${r.domestic.id}`);
        }
        const expectedName = [...companyNameToId.entries()].find(([, id]) => id === r.domestic.id)?.[0];
        if (expectedName && r.domestic.name && expectedName !== r.domestic.name) {
          err('collaborations.json', `关系 ${label} 的 domestic.name("${r.domestic.name}")与公司表("${expectedName}")不一致`);
        }
      }

      // 工厂/办事处类必须有 location 和 overseas.country;其余类型必须有 overseas.name/country
      if (r.type === 'overseas-factory' || r.type === 'overseas-office') {
        if (!r.location) err('collaborations.json', `关系 ${label} (${r.type}) 缺少 location`);
        if (!r.overseas?.country) err('collaborations.json', `关系 ${label} (${r.type}) 缺少 overseas.country`);
      } else {
        if (!r.overseas?.name) err('collaborations.json', `关系 ${label} 缺少 overseas.name`);
        if (!r.overseas?.country) err('collaborations.json', `关系 ${label} 缺少 overseas.country`);
      }
    }

    // summary.byType 应覆盖实际出现的所有类型
    const byType = collabData.summary?.byType || {};
    for (const t of typesPresent) {
      if (!(t in byType)) warn('collaborations.json', `summary.byType 缺少类型 "${t}" 的说明`);
    }
  }
  console.log('');
}

/* ---------------- labor-rights.json ---------------- */
const laborData = loadJSON('labor-rights.json');

if (laborData) {
  console.log('📄 验证 labor-rights.json');

  if (!laborData.metadata) warn('labor-rights.json', '缺少 metadata 字段');

  if (!Array.isArray(laborData.legalFrameworks)) {
    err('labor-rights.json', '缺少 legalFrameworks 数组');
  } else {
    ok(`包含 ${laborData.legalFrameworks.length} 个法律框架`);
    for (const f of laborData.legalFrameworks) {
      if (!f.id || !f.name) err('labor-rights.json', `legalFrameworks 条目缺少 id/name: ${JSON.stringify(f).slice(0, 60)}`);
    }
  }

  if (!Array.isArray(laborData.reportingChannels)) {
    err('labor-rights.json', '缺少 reportingChannels 数组');
  } else {
    ok(`包含 ${laborData.reportingChannels.length} 个投诉渠道`);
    for (const ch of laborData.reportingChannels) {
      if (!ch.id || !ch.name) err('labor-rights.json', `reportingChannels 条目缺少 id/name: ${JSON.stringify(ch).slice(0, 60)}`);
    }
  }

  if (!Array.isArray(laborData.complianceRatings)) {
    warn('labor-rights.json', '缺少 complianceRatings 数组(可选)');
  }

  console.log('');
}

/* ---------------- 总结 ---------------- */
const fileCount = [companiesData, collabData, laborData].filter(Boolean).length;
console.log('='.repeat(50));
console.log('验证总结：');
console.log(`  ✅ 读取成功: ${fileCount}/3 个文件`);
console.log(`  ❌ 错误: ${errors} 个`);
console.log(`  ⚠️  警告: ${warnings} 个`);

if (errors > 0) {
  console.log('\n❌ 验证失败，请修复上述错误');
  process.exit(1);
} else {
  console.log('\n✅ 验证通过！');
  process.exit(0);
}
