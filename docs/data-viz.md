# 数据可视化说明 (Data Visualization Guide)

## 📊 项目数据结构

### 文件结构

```
HOPE/
├── README.md                 # 项目说明
├── CONTRIBUTING.md           # 贡献指南
├── LICENSE                   # Anti-996 License
├── package.json              # 项目配置
├── data/
│   ├── companies.json        # 企业信息
│   ├── collaborations.json   # 海外合作关系
│   └── labor-rights.json     # 各国劳动法规与合规参考
├── docs/
│   ├── 企业合作关系一览.md    # 由脚本自动生成的可读明细页
│   └── data-viz.md           # 本文件
└── scripts/
    ├── generate-docs.js      # 生成《企业合作关系一览》与 README 核心企业节
    ├── lib/industry.js       # 行业/地区归并共享映射
    ├── validate.js           # 数据校验
    └── stats.js              # 数据统计
```

## 🔍 数据字段说明

### companies.json 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 公司唯一标识(如 `med-002`、`cn-auto-001`) |
| name.zh / name.en | string | 中文名称 / 英文名称 |
| ticker | string | 股票代码,非上市公司为"非上市" |
| industry | string | 行业分类 |
| location.hq | string | 总部(城市, 省份) |
| location.production | string[] | 生产基地(可选) |
| founded | string | 成立年份(可选) |
| mainBusiness | string | 主营业务(可选) |
| products | string[] | 主要产品(可选) |
| partners | array | 海外合作伙伴摘要:`{name, country, type}` |
| tags | string[] | 标签 |

### collaborations.json 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 关系唯一标识(`rel-001` 起) |
| type | string | 关系类型,见下表 |
| domestic | object | 关系主体企业:`{id, name}`,`id` 对应 companies.json |
| overseas | object | 海外对象:`{name, country}`;工厂/办事处类可省略 `name` |
| products | string[] | 涉及产品 |
| since | string | 开始年份(可选,不确定则省略) |
| location | string | 海外工厂/办事处地点(仅 overseas-factory / overseas-office) |
| capacity | string | 产能(可选,仅在有公开数字时填) |
| status | string | 建设状态:`已投产 / 建设中 / 规划中`(工厂类) |
| jointVenture | string | 合资公司全名(仅 joint-venture) |
| purpose | string | 合资目的(仅 joint-venture) |
| source | string | 该条事实的公开来源 URL(推荐填写) |

**关系类型(`type`):**

| 值 | 含义 |
|----|------|
| supplier-customer | 供应关系 - 企业向海外客户供货 |
| overseas-factory | 海外建厂 - 企业在海外设立工厂 |
| overseas-office | 海外办事处 - 海外设立办公/研发机构 |
| joint-venture | 合资企业 - 与海外企业成立合资公司 |
| acquisition | 海外并购 - 收购海外企业或业务 |
| licensing | 技术授权 - 向海外企业授权技术/产品 |
| outsourcing | 外包代工 - 委托海外企业代工生产 |

### labor-rights.json 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| legalFrameworks[].id | string | 法规唯一标识 |
| legalFrameworks[].name | string | 法规名称(英文) |
| legalFrameworks[].jurisdiction | string | 适用司法辖区 |
| legalFrameworks[].requirements | string[] | 核心要求 |
| reportingChannels[].id | string | 渠道唯一标识 |
| reportingChannels[].name | string | 渠道名称 |
| complianceRatings[].rating | string | 评级档位(A/B/C/D/待评估) |

## 📈 数据统计

运行统计脚本获取最新数字,修改数据后用 `npm run docs` 重新生成可读明细页:

```bash
npm run stats
npm run docs
```

输出包括:公司行业大类分布、总部区域分布、关系类型分布、海外国家/地区 Top 榜、数据覆盖度(多少企业尚无合作关系记录)。

## 🛠️ 使用 JSON 数据

### JavaScript / Node.js

```javascript
const { companies } = require('./data/companies.json');
const { relationships } = require('./data/collaborations.json');

// 某家企业的全部海外关系(如 宁德时代 cn-auto-001)
const catl = relationships.filter(r => r.domestic.id === 'cn-auto-001');

// 供应关系:企业 -> 海外客户
const supply = relationships.filter(r => r.type === 'supplier-customer')
  .map(r => `${r.domestic.name} → ${r.overseas.name} (${r.overseas.country})`);
```

### Python

```python
import json
from collections import Counter

with open('data/collaborations.json', encoding='utf-8') as f:
    data = json.load(f)

# 按海外国家统计合作关系
countries = Counter(r['overseas']['country'] for r in data['relationships'])
print(countries.most_common(10))
```

## 📊 示例查询 (jq)

### 查找所有供应关系

```bash
jq '.relationships[] | select(.type == "supplier-customer") | "\(.domestic.name) -> \(.overseas.name)"' data/collaborations.json
```

### 查找已投产的海外工厂

```bash
jq '.relationships[] | select(.type == "overseas-factory" and .status == "已投产") | "\(.domestic.name): \(.location)"' data/collaborations.json
```

### 按国家统计合作条数

```bash
jq -r '.relationships[].overseas.country' data/collaborations.json | sort | uniq -c | sort -rn
```
