#!/usr/bin/env node

/**
 * 可读文档生成脚本
 * 从 data/*.json 生成《企业合作关系一览》Markdown,供不熟悉数据的读者直接浏览/搜索
 *
 * 用法: node scripts/generate-docs.js
 * 修改数据后请重新运行,CI 会校验生成文档与数据保持一致
 */

const fs = require('fs');
const path = require('path');
const { groupOf } = require('./lib/industry.js');

const dataDir = path.join(__dirname, '..', 'data');
const outFile = path.join(__dirname, '..', 'docs', '企业合作关系一览.md');

const companiesData = JSON.parse(fs.readFileSync(path.join(dataDir, 'companies.json'), 'utf-8'));
const collabData = JSON.parse(fs.readFileSync(path.join(dataDir, 'collaborations.json'), 'utf-8'));

const companies = companiesData.companies || [];
const rels = collabData.relationships || [];

const esc = (s = '') => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const companyById = new Map(companies.map(c => [c.id, c]));

/* 关系类型 → 中文简称 */
const TYPE_SHORT = {
  'supplier-customer': '供货',
  'joint-venture': '合资',
  'acquisition': '并购',
  'overseas-factory': '海外建厂',
  'licensing': '技术授权',
  'outsourcing': '代工/组装',
  'overseas-office': '海外机构'
};

const orderIndex = new Map(companies.map((c, i) => [c.id, i]));
const PINNED = new Set(['cn-auto-003', 'med-001']);
const sortList = (list, stable = false) => list.slice().sort((a, b) => {
  const pa = PINNED.has(a.id) ? orderIndex.get(a.id) : Number.MAX_SAFE_INTEGER;
  const pb = PINNED.has(b.id) ? orderIndex.get(b.id) : Number.MAX_SAFE_INTEGER;
  if (pa !== pb) return pa - pb;
  const relDiff = (relsByCompany.get(b.id)?.length || 0) - (relsByCompany.get(a.id)?.length || 0);
  if (relDiff !== 0) return relDiff;
  return stable
    ? (orderIndex.get(a.id) || 0) - (orderIndex.get(b.id) || 0)
    : (a.name?.zh || '').localeCompare(b.name?.zh || '', 'zh');
});

/* 关系按企业分组 */
const relsByCompany = new Map();
for (const r of rels) {
  const id = r.domestic?.id;
  if (!id) continue;
  if (!relsByCompany.has(id)) relsByCompany.set(id, []);
  relsByCompany.get(id).push(r);
}

/* 行业分组 */
const groups = new Map();
for (const c of companies) {
  const g = groupOf(c.industry);
  if (!groups.has(g)) groups.set(g, []);
  groups.get(g).push(c);
}
const groupNames = [...groups.keys()].sort((a, b) => groups.get(b).length - groups.get(a).length);

/* 生成 */
const today = new Date().toISOString().slice(0, 10);
const out = [];
out.push(`# 企业合作关系一览`);
out.push('');
out.push(`> 本页面由 \`npm run docs\` 从数据文件自动生成(生成日期:${today})。共 **${companies.length} 家企业**、**${rels.length} 条合作关系**。`);
out.push('>');
out.push('> **怎么找**:按 \`Ctrl+F\`(Mac 为 \`Command+F\`)输入公司名即可跳转;或点下方目录。');
out.push('> 想补充或纠错?见 [CONTRIBUTING.md](../CONTRIBUTING.md)。数据源头文件为 \`data/*.json\`。');
out.push('');
out.push('## 目录');
out.push('');
for (const g of groupNames) {
  const list = sortList(groups.get(g));
  out.push(`- **${g}**(${list.length} 家):${list.map(c => `[${c.name?.zh}](#${(c.name?.zh || '').toLowerCase()})`).join(' · ')}`);
}
out.push('');
out.push('---');
out.push('');

for (const g of groupNames) {
  const list = sortList(groups.get(g));
  out.push(`## ${g}`);
  out.push('');
  for (const c of list) {
    const myRels = (relsByCompany.get(c.id) || []).slice().sort((a, b) => (a.type || '').localeCompare(b.type || ''));
    out.push(`### ${c.name?.zh}`);
    out.push('');
    const meta = [
      c.location?.hq ? `总部:${c.location.hq}` : null,
      c.ticker ? `股票:${c.ticker}` : null,
      c.industry ? `行业:${c.industry}` : null
    ].filter(Boolean).join(' · ');
    out.push(`${meta}`);
    if (c.mainBusiness) out.push(`${c.mainBusiness}`);
    out.push('');
    if (myRels.length === 0) {
      out.push(`> 📭 暂无公开合作关系记录,欢迎补充(见 [CONTRIBUTING.md](../CONTRIBUTING.md))。`);
      out.push('');
      continue;
    }
    out.push('| 合作对象 / 项目 | 国家/地区 | 类型 | 年份 | 说明 | 来源 |');
    out.push('|---|---|---|---|---|---|');
    for (const r of myRels) {
      const obj = r.overseas?.name || r.location || r.overseas?.country || '—';
      const country = r.overseas?.country || '—';
      const type = TYPE_SHORT[r.type] || r.type;
      const year = r.since || '';
      const notes = [];
      if (r.products?.length) notes.push(r.products.join('、'));
      if (r.location) notes.push(`地点:${r.location}`);
      if (r.status) notes.push(r.status);
      if (r.capacity) notes.push(`产能:${r.capacity}`);
      if (r.jointVenture) notes.push(`合资公司:${r.jointVenture}`);
      if (r.purpose) notes.push(r.purpose);
      const src = r.source ? `[来源](${r.source})` : '';
      out.push(`| ${esc(obj)} | ${esc(country)} | ${type} | ${esc(year)} | ${esc(notes.join(';'))} | ${src} |`);
    }
    out.push('');
  }
}

out.push('---');
out.push('');
out.push(`> 数据截至 ${companiesData.metadata?.lastUpdated || today},来源均来自公开渠道(公司公告、官网、权威媒体报道)。本项目采用 Anti-996 License。`);
out.push('');

fs.writeFileSync(outFile, out.join('\n'), 'utf-8');


/* 生成 README 的"核心企业"节(标记之间内容自动替换) */
const readmePath = path.join(__dirname, '..', 'README.md');
if (fs.existsSync(readmePath)) {
  const BEGIN = '<!-- AUTO:core-companies:BEGIN -->';
  const END = '<!-- AUTO:core-companies:END -->';
  let readme = fs.readFileSync(readmePath, 'utf-8');
  if (readme.includes(BEGIN) && readme.includes(END)) {
    const SHOWCASE = ['汽车', '家电', '电池与新能源', 'ICT与消费电子', '半导体', '医疗器械与IVD'];
    const core = [];
    core.push(`> 本节由 \`npm run docs\` 自动生成，完整明细见[企业合作关系一览](docs/企业合作关系一览.md)。`);
    core.push('');
    for (const g of SHOWCASE) {
      if (!groups.has(g)) continue;
      const list = sortList(groups.get(g), true).slice(0, 6);
      core.push(`### ${g}`);
      core.push('');
      core.push('| 企业 | 主要海外合作 |');
      core.push('|------|-------------|');
      for (const c of list) {
        const myRels = relsByCompany.get(c.id) || [];
        const seen = new Set();
        const items = [];
        for (const r of myRels) {
          const obj = r.overseas?.name || r.location;
          if (!obj || seen.has(obj)) continue;
          seen.add(obj);
          items.push(`${obj}（${TYPE_SHORT[r.type] || r.type}）`);
          if (items.length >= 5) break;
        }
        if (myRels.length === 0) {
          if (!PINNED.has(c.id)) continue;
          core.push(`| ${c.name?.zh} | 暂无公开记录，欢迎补充 |`);
          continue;
        }
        core.push(`| ${c.name?.zh} | ${items.join('、')} |`);
      }
      core.push('');
    }
    readme = readme.replace(
      new RegExp(`${BEGIN.replace(/[.*+?^${}()|[\]\\\\]/g, '\\$&')}[\\s\\S]*?${END.replace(/[.*+?^${}()|[\]\\\\]/g, '\\$&')}`),
      [BEGIN, ...core, END].join('\n')
    );
    /* 收录数量占位符(同名标记可在文中多处使用) */
    const setCount = (text, marker, value) => text.replace(new RegExp(`<!-- AUTO:${marker}:BEGIN -->[\\s\\S]*?<!-- AUTO:${marker}:END -->`, 'g'), `<!-- AUTO:${marker}:BEGIN -->${value}<!-- AUTO:${marker}:END -->`);
    readme = setCount(readme, 'count-companies', companies.length);
    readme = setCount(readme, 'count-rels', rels.length);
    fs.writeFileSync(readmePath, readme, 'utf-8');
    console.log('✅ 已更新 README.md 核心企业节');
  }
}
/* 更新 SIMPLE-GUIDE 的行业一览表与收录数量 */
const guidePath = path.join(__dirname, '..', '企业出海观察.md');
if (fs.existsSync(guidePath)) {
  const GB = '<!-- AUTO:industry-table:BEGIN -->';
  const GE = '<!-- AUTO:industry-table:END -->';
  let guide = fs.readFileSync(guidePath, 'utf-8');
  const setCount = (text, marker, value) => text.replace(new RegExp(`<!-- AUTO:${marker}:BEGIN -->[\\s\\S]*?<!-- AUTO:${marker}:END -->`, 'g'), `<!-- AUTO:${marker}:BEGIN -->${value}<!-- AUTO:${marker}:END -->`);
  guide = setCount(guide, 'count-companies', companies.length);
  guide = setCount(guide, 'count-rels', rels.length);
  if (guide.includes(GB) && guide.includes(GE)) {
    const GUIDE_ROWS = [
      ['医疗器械与IVD', '🏥 医疗器械', '做医疗检验设备、诊断试剂、医疗影像等'],
      ['汽车', '🚗 汽车', '整车出口、海外建厂、给汽车厂供货、动力电池'],
      ['ICT与消费电子', '📱 消费电子', '手机、电脑、无人机、光模块、电信运营'],
      ['家电', '🏠 家电', '做空调、冰箱、电视'],
      ['半导体', '💡 半导体', '做芯片、封测、晶圆代工'],
      ['电池与新能源', '☀️ 新能源与电池', '光伏、风电、逆变器、动力电池'],
      ['能源电力', '⚡ 能源电力', '电网、发电、煤炭、油气'],
      ['建筑工程', '🏗️ 建筑工程', '海外工程承包与基建'],
      ['冶金与矿业', '⛏️ 冶金与矿业', '钢铁、有色金属、矿业'],
      ['高端装备', '🚜 高端装备', '工程机械、轨道交通、航空、船舶、防务'],
      ['物流与航运', '🚢 物流与航运', '航运、物流、供应链运营'],
      ['金融', '🏦 金融', '银行、保险'],
      ['化工', '🧪 化工', '炼化与化工'],
      ['医药', '💊 医药', '做药与医药流通'],
      ['消费品与品牌', '🛒 消费品与品牌', '运动品牌、食品饮料、潮玩、零售'],
      ['显示与光学', '📺 显示与光学', '显示屏、声学、镜头'],
      ['综合集团', '🏢 综合集团', '多元化产业集团'],
      ['房地产', '🏘️ 房地产', '房地产开发']
    ];
    const rows = [];
    const seenGroups = new Set();
    for (const [g, label, desc] of GUIDE_ROWS) {
      if (!groups.has(g)) continue;
      seenGroups.add(g);
      const list = sortList(groups.get(g));
      if (!list.length) continue;
      rows.push(`| ${label} | ${list.map(c => c.name?.zh).join('、')} | ${desc} |`);
    }
    const others = companies.filter(c => !seenGroups.has(groupOf(c.industry)));
    if (others.length) rows.push(`| 🔧 其他 | ${others.map(c => c.name?.zh).join('、')} | 其他行业 |`);
    const table = ['| 行业 | 有谁？ | 干什么的？ |', '|------|--------|-----------|', ...rows].join('\n');
    guide = guide.replace(
      new RegExp(GB.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + GE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      [GB, table, GE].join('\n')
    );
    /* 国家分布表:按合作关系数统计Top10,附代表企业 */
    const CBEGIN = '<!-- AUTO:country-table:BEGIN -->';
    const CEND = '<!-- AUTO:country-table:END -->';
    if (guide.includes(CBEGIN) && guide.includes(CEND)) {
      const FLAG = { '美国': '🇺🇸', '德国': '🇩🇪', '中国香港': '🇭🇰', '日本': '🇯🇵', '巴西': '🇧🇷', '泰国': '🇹🇭', '意大利': '🇮🇹', '越南': '🇻🇳', '马来西亚': '🇲🇾', '巴基斯坦': '🇵🇰', '匈牙利': '🇭🇺', '印度': '🇮🇳', '英国': '🇬🇧', '新加坡': '🇸🇬', '沙特阿拉伯': '🇸🇦', '韩国': '🇰🇷', '法国': '🇫🇷', '西班牙': '🇪🇸', '印度尼西亚': '🇮🇩', '埃及': '🇪🇬', '俄罗斯': '🇷🇺', '墨西哥': '🇲🇽', '荷兰': '🇳🇱', '澳大利亚': '🇦🇺', '瑞典': '🇸🇪', '瑞士': '🇨🇭', '葡萄牙': '🇵🇹', '希腊': '🇬🇷', '捷克': '🇨🇿', '波兰': '🇵🇱', '南非': '🇿🇦', '土耳其': '🇹🇷', '加拿大': '🇨🇦', '菲律宾': '🇵🇭', '阿联酋': '🇦🇪', '爱尔兰': '🇮🇪', '智利': '🇨🇱', '秘鲁': '🇵🇪', '几内亚': '🇬🇳', '老挝': '🇱🇦', '柬埔寨': '🇰🇭', '哈萨克斯坦': '🇰🇿', '马耳他': '🇲🇹', '塞尔维亚': '🇷🇸', '厄瓜多尔': '🇪🇨', '斯洛文尼亚': '🇸🇮' };
      const byCountry = new Map();
      for (const r of rels) {
        const c = r.overseas?.country;
        if (!c || c === '多国' || c === '全球') continue;
        if (!byCountry.has(c)) byCountry.set(c, []);
        byCountry.get(c).push(r);
      }
      const topCountries = [...byCountry.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 10);
      const crows = topCountries.map(([country, list], i) => {
        const names = [];
        for (const r of list) {
          const n = r.domestic?.name;
          if (n && !names.includes(n)) names.push(n);
          if (names.length >= 3) break;
        }
        return `| ${i + 1} | ${FLAG[country] || '🌍'} ${country} | ${list.length} | ${names.join('、')} |`;
      });
      const ctable = ['| 排名 | 国家 | 关系数 | 代表企业 |', '|------|------|--------|----------|', ...crows].join('\n');
      guide = guide.replace(new RegExp(CBEGIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + CEND.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), [CBEGIN, ctable, CEND].join('\n'));
      console.log('✅ 已更新 国家分布表');
    }
    fs.writeFileSync(guidePath, guide, 'utf-8');
    console.log('✅ 已更新 企业出海观察.md 行业一览表');
  }
}

/* 更新英文版指南 Going-Global.md */
const enGuidePath = path.join(__dirname, '..', 'Going-Global.md');
if (fs.existsSync(enGuidePath)) {
  let en = fs.readFileSync(enGuidePath, 'utf-8');
  const setCount = (text, marker, value) => text.replace(new RegExp(`<!-- AUTO:${marker}:BEGIN -->[\\s\\S]*?<!-- AUTO:${marker}:END -->`, 'g'), `<!-- AUTO:${marker}:BEGIN -->${value}<!-- AUTO:${marker}:END -->`);
  en = setCount(en, 'en-count-companies', companies.length);
  en = setCount(en, 'en-count-rels', rels.length);
  const enName = (c) => (c.name?.en && String(c.name.en).trim()) ? c.name.en : c.name?.zh;
  const EGB = '<!-- AUTO:en-industry-table:BEGIN -->';
  const EGE = '<!-- AUTO:en-industry-table:END -->';
  const EN_ROWS = [
    ['医疗器械与IVD', '🏥 Medical Devices & IVD', 'Lab instruments, diagnostics reagents, medical imaging'],
    ['汽车', '🚗 Automotive', 'Vehicle exports, overseas plants, supplying global automakers, power batteries'],
    ['ICT与消费电子', '📱 Consumer Electronics & ICT', 'Phones, PCs, drones, optical modules, telecom carriers'],
    ['家电', '🏠 Home Appliances', 'Air conditioners, refrigerators, TVs'],
    ['半导体', '💡 Semiconductors', 'Chips, packaging & testing, foundries'],
    ['电池与新能源', '☀️ New Energy & Batteries', 'Solar, wind, inverters, power batteries'],
    ['能源电力', '⚡ Power & Energy', 'Grids, power generation, coal, oil & gas'],
    ['建筑工程', '🏗️ Construction & Engineering', 'Overseas contracting and infrastructure'],
    ['冶金与矿业', '⛏️ Metals & Mining', 'Steel, nonferrous metals, mining'],
    ['高端装备', '🚜 Advanced Equipment', 'Construction machinery, rail transit, aviation, ships, defense'],
    ['物流与航运', '🚢 Logistics & Shipping', 'Shipping, logistics, supply-chain operations'],
    ['金融', '🏦 Finance', 'Banks and insurers'],
    ['化工', '🧪 Chemicals', 'Refining and chemicals'],
    ['医药', '💊 Pharma', 'Drug makers and pharma distribution'],
    ['消费品与品牌', '🛒 Consumer Brands', 'Sportswear, food & beverage, toys, retail'],
    ['显示与光学', '📺 Displays & Optics', 'Displays, acoustics, lenses'],
    ['综合集团', '🏢 Conglomerates', 'Diversified state-owned groups'],
    ['房地产', '🏘️ Real Estate', 'Property development']
  ];
  if (en.includes(EGB) && en.includes(EGE)) {
    const erows = [];
    const eseen = new Set();
    for (const [g, label, desc] of EN_ROWS) {
      if (!groups.has(g)) continue;
      eseen.add(g);
      const list = sortList(groups.get(g));
      if (!list.length) continue;
      erows.push(`| ${label} | ${list.map(enName).join(', ')} | ${desc} |`);
    }
    const eothers = companies.filter(c => !eseen.has(groupOf(c.industry)));
    if (eothers.length) erows.push(`| 🔧 Others | ${eothers.map(enName).join(', ')} | Other industries |`);
    const etable = ['| Industry | Companies | What they do |', '|------|--------|-----------|', ...erows].join('\n');
    en = en.replace(new RegExp(EGB.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + EGE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), [EGB, etable, EGE].join('\n'));
  }
  const ECB = '<!-- AUTO:en-country-table:BEGIN -->';
  const ECE = '<!-- AUTO:en-country-table:END -->';
  if (en.includes(ECB) && en.includes(ECE)) {
    const EN_COUNTRY = { '美国': 'United States', '德国': 'Germany', '中国香港': 'Hong Kong, China', '日本': 'Japan', '巴西': 'Brazil', '泰国': 'Thailand', '意大利': 'Italy', '越南': 'Vietnam', '马来西亚': 'Malaysia', '巴基斯坦': 'Pakistan', '匈牙利': 'Hungary', '印度': 'India', '英国': 'United Kingdom', '新加坡': 'Singapore', '沙特阿拉伯': 'Saudi Arabia', '韩国': 'South Korea', '法国': 'France', '西班牙': 'Spain', '印度尼西亚': 'Indonesia', '埃及': 'Egypt', '俄罗斯': 'Russia', '墨西哥': 'Mexico', '荷兰': 'Netherlands', '澳大利亚': 'Australia', '瑞典': 'Sweden', '瑞士': 'Switzerland', '葡萄牙': 'Portugal', '希腊': 'Greece', '捷克': 'Czechia', '波兰': 'Poland', '南非': 'South Africa', '土耳其': 'Türkiye', '加拿大': 'Canada', '菲律宾': 'Philippines', '阿联酋': 'UAE', '爱尔兰': 'Ireland', '智利': 'Chile', '秘鲁': 'Peru', '几内亚': 'Guinea', '老挝': 'Laos', '柬埔寨': 'Cambodia', '哈萨克斯坦': 'Kazakhstan', '马耳他': 'Malta', '塞尔维亚': 'Serbia', '厄瓜多尔': 'Ecuador', '斯洛文尼亚': 'Slovenia' };
    const FLAG_EN = { '美国': '🇺🇸', '德国': '🇩🇪', '中国香港': '🇭🇰', '日本': '🇯🇵', '巴西': '🇧🇷', '泰国': '🇹🇭', '意大利': '🇮🇹', '越南': '🇻🇳', '马来西亚': '🇲🇾', '巴基斯坦': '🇵🇰', '匈牙利': '🇭🇺', '印度': '🇮🇳', '英国': '🇬🇧', '新加坡': '🇸🇬', '沙特阿拉伯': '🇸🇦', '韩国': '🇰🇷', '俄罗斯': '🇷🇺', '埃及': '🇪🇬', '墨西哥': '🇲🇽', '印度尼西亚': '🇮🇩', '荷兰': '🇳🇱', '澳大利亚': '🇦🇺', '瑞典': '🇸🇪', '瑞士': '🇨🇭', '葡萄牙': '🇵🇹', '希腊': '🇬🇷', '南非': '🇿🇦', '波兰': '🇵🇱', '捷克': '🇨🇿' };
    const byC = new Map();
    for (const r of rels) {
      const c = r.overseas?.country;
      if (!c || c === '多国' || c === '全球') continue;
      if (!byC.has(c)) byC.set(c, []);
      byC.get(c).push(r);
    }
    const topC = [...byC.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 10);
    const ecrows = topC.map(([country, list], i) => {
      const names = [];
      for (const r of list) {
        const n = r.domestic?.name;
        if (n && !names.includes(n)) names.push(n);
        if (names.length >= 3) break;
      }
      return `| ${i + 1} | ${FLAG_EN[country] || '🌍'} ${EN_COUNTRY[country] || country} | ${list.length} | ${names.join(', ')} |`;
    });
    const ectable = ['| Rank | Country | Relationships | Representative companies |', '|------|---------|---------------|--------------------------|', ...ecrows].join('\n');
    en = en.replace(new RegExp(ECB.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + ECE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), [ECB, ectable, ECE].join('\n'));
  }
  fs.writeFileSync(enGuidePath, en, 'utf-8');
  console.log('✅ 已更新 Going-Global.md (EN)');
}

/* 更新英文版 README_EN.md */
const enReadmePath = path.join(__dirname, '..', 'README_EN.md');
if (fs.existsSync(enReadmePath)) {
  const ECBEGIN = '<!-- AUTO:en-core-companies:BEGIN -->';
  const ECEND = '<!-- AUTO:en-core-companies:END -->';
  let enReadme = fs.readFileSync(enReadmePath, 'utf-8');
  const enSetCount = (text, marker, value) => text.replace(new RegExp(`<!-- AUTO:${marker}:BEGIN -->[\\s\\S]*?<!-- AUTO:${marker}:END -->`, 'g'), `<!-- AUTO:${marker}:BEGIN -->${value}<!-- AUTO:${marker}:END -->`);
  enReadme = enSetCount(enReadme, 'en-count-companies', companies.length);
  enReadme = enSetCount(enReadme, 'en-count-rels', rels.length);
  if (enReadme.includes(ECBEGIN) && enReadme.includes(ECEND)) {
    const SHOWCASE_EN = ['汽车', '家电', '电池与新能源', 'ICT与消费电子', '半导体', '医疗器械与IVD'];
    const EN_GROUP = { '汽车': 'Automotive', '家电': 'Home Appliances', '电池与新能源': 'New Energy & Batteries', 'ICT与消费电子': 'Consumer Electronics & ICT', '半导体': 'Semiconductors', '医疗器械与IVD': 'Medical Devices & IVD' };
    const TYPE_EN = { 'supplier-customer': 'supply', 'joint-venture': 'JV', 'acquisition': 'M&A', 'overseas-factory': 'overseas plant', 'licensing': 'licensing', 'outsourcing': 'OEM', 'overseas-office': 'overseas office' };
    const OBJ_EN = { '宝马': 'BMW', '奔驰': 'Mercedes-Benz', '戴姆勒': 'Daimler', '大众': 'Volkswagen', '奥迪': 'Audi', '特斯拉': 'Tesla', '丰田': 'Toyota', '本田': 'Honda', '日产': 'Nissan', '现代': 'Hyundai', '起亚': 'Kia', '通用': 'General Motors', '福特': 'Ford', '苹果': 'Apple', '三星': 'Samsung', '索尼': 'Sony', '谷歌': 'Google', '微软': 'Microsoft', '英特尔': 'Intel', '高通': 'Qualcomm', '沃尔沃': 'Volvo', '诺华': 'Novartis', '麦当劳': "McDonald's", '星巴克': 'Starbucks', '匈牙利': 'Hungary', '泰国': 'Thailand', '巴西': 'Brazil', '美国': 'United States', '德国': 'Germany', '日本': 'Japan', '墨西哥': 'Mexico', '波兰': 'Poland', '塞尔维亚': 'Serbia', '印度': 'India', '印度尼西亚': 'Indonesia', '印尼': 'Indonesia', '巴基斯坦': 'Pakistan', '土耳其': 'Turkey', '意大利': 'Italy', '法国': 'France', '英国': 'United Kingdom', '西班牙': 'Spain', '越南': 'Vietnam', '马来西亚': 'Malaysia', '瑞典': 'Sweden', '荷兰': 'Netherlands', '韩国': 'South Korea', '瑞士': 'Switzerland', '埃及': 'Egypt', '南非': 'South Africa', '俄罗斯': 'Russia', '沙特阿拉伯': 'Saudi Arabia', '阿联酋': 'UAE', '以色列': 'Israel', '新加坡': 'Singapore', '菲律宾': 'Philippines', '捷克': 'Czechia', '澳大利亚': 'Australia', '加拿大': 'Canada', '智利': 'Chile', '秘鲁': 'Peru', '几内亚': 'Guinea', '老挝': 'Laos', '柬埔寨': 'Cambodia', '哈萨克斯坦': 'Kazakhstan', '马耳他': 'Malta', '中国香港': 'Hong Kong', '东南亚': 'Southeast Asia', '欧洲': 'Europe', '中东': 'Middle East', '非洲': 'Africa', '拉美': 'Latin America', '全球': 'Global' };
    const objEn = (s) => OBJ_EN[s] || s;
    const enName = (c) => (c.name?.en && String(c.name.en).trim()) ? c.name.en : c.name?.zh;
    const core = [];
    core.push(`> This section is auto-generated by \`npm run docs\`. Full details: [企业合作关系一览](docs/企业合作关系一览.md).`);
    core.push('');
    for (const g of SHOWCASE_EN) {
      if (!groups.has(g)) continue;
      const list = sortList(groups.get(g), true).slice(0, 6);
      core.push(`### ${EN_GROUP[g] || g} · ${g}`);
      core.push('');
      core.push('| Company | Key overseas relationships |');
      core.push('|------|-------------|');
      for (const c of list) {
        const myRels = relsByCompany.get(c.id) || [];
        const seen = new Set();
        const items = [];
        for (const r of myRels) {
          const obj = r.overseas?.name || r.location;
          if (!obj || seen.has(obj)) continue;
          seen.add(obj);
          items.push(`${objEn(obj)} (${TYPE_EN[r.type] || r.type})`);
          if (items.length >= 5) break;
        }
        if (myRels.length === 0) {
          if (!PINNED.has(c.id)) continue;
          core.push(`| ${enName(c)} | No public records yet — contributions welcome |`);
          continue;
        }
        core.push(`| ${enName(c)} | ${items.join(', ')} |`);
      }
      core.push('');
    }
    enReadme = enReadme.replace(new RegExp(ECBEGIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + ECEND.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), [ECBEGIN, ...core, ECEND].join('\n'));
  }
  fs.writeFileSync(enReadmePath, enReadme, 'utf-8');
  console.log('✅ 已更新 README_EN.md 核心企业节');
}

console.log(`✅ 已生成 docs/企业合作关系一览.md(${companies.length} 家企业,${rels.length} 条关系,${out.length} 行)`);
