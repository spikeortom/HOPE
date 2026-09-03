# 贡献指南 (Contributing Guide)

感谢您对 **HOPE** 项目的关注！我们欢迎任何形式的贡献。

## 📋 贡献方式

### 1. 添加新公司数据

如果您了解企业跨境合作的公开信息，请提供以下信息：

**公司基本信息：**
- 公司名称（中英文）
- 行业分类
- 总部地点（城市, 省份）
- 上市信息（股票代码，非上市注明）
- 主营业务与主要产品

**合作关系信息：**
- 供应关系（企业 → 海外客户）
- 海外工厂/办事处（地点、状态、产能）
- 合资企业（合资公司全名、目的）
- 海外并购 / 技术授权 / 外包代工
- 每条关系请注明公开来源（年报、官网、权威报道）

### 2. 更新现有数据

如果已有数据需要更新，请：
- 提供新的数据来源
- 说明更新原因
- 确保信息准确

### 3. 补充劳动法规与合规信息

如果您了解目标市场国家的劳动法规或供应链合规要求，请提供：
- 法规名称与适用辖区
- 生效时间与适用范围
- 核心合规要求
- 官方或权威来源链接

## 📝 数据格式

### 公司信息 (companies.json)

```json
{
  "id": "cn-auto-001",
  "name": {
    "zh": "公司中文名",
    "en": "Company English Name"
  },
  "ticker": "600104.SH 或 非上市",
  "industry": "行业分类",
  "location": {
    "hq": "城市, 省份"
  },
  "mainBusiness": "一句话主营业务",
  "products": ["主要产品"],
  "partners": [
    {"name": "海外伙伴", "country": "国家", "type": "客户|供应商|合资方|被收购方"}
  ],
  "tags": ["标签"]
}
```

### 合作关系 (collaborations.json)

```json
{
  "id": "rel-001",
  "type": "supplier-customer",
  "domestic": {"id": "cn-auto-001", "name": "宁德时代"},
  "overseas": {"name": "特斯拉", "country": "美国"},
  "products": ["动力电池"],
  "since": "2020",
  "source": "来源URL"
}
```

> 工厂/办事处类（overseas-factory / overseas-office）可省略 `overseas.name`，
> 但必须有 `location`（如 "匈牙利德布勒森"）和 `overseas.country`（如 "匈牙利"）。

### 劳动法规与合规 (labor-rights.json)

```json
{
  "id": "legal-xxx",
  "name": "Regulation Name",
  "jurisdiction": "European Union",
  "shortName": "中文简称",
  "description": "一句话说明",
  "requirements": ["核心要求"],
  "applicableScope": "适用范围",
  "effectiveDate": "生效时间"
}
```

## 🔍 数据来源

请确保数据来自可靠的来源：

- ✅ 公司官方网站
- ✅ 上市公司公告
- ✅ 主流媒体报道
- ✅ 政府公开信息
- ✅ 个人亲身经历（需注明）
- ❌ 未经证实的传言

## ✅ 提交Pull Request

1. Fork 本项目
2. 创建你的分支：
   ```bash
   git checkout -b feature/add-company-xxx
   ```
3. 添加或修改数据
4. 运行 `npm run validate` 确保校验通过，运行 `npm run docs` 更新《企业合作关系一览》页面
5. 提交更改：
   ```bash
   git commit -m "Add company: XXX"
   ```
6. 推送到分支：
   ```bash
   git push origin feature/add-company-xxx
   ```
7. 开启 Pull Request

## 📌 注意事项

1. **数据准确性**：确保提供的信息尽可能准确
2. **隐私保护**：不要包含个人隐私信息
3. **客观中立**：保持客观中立的立场
4. **遵守法律**：不发布违反法律法规的内容

## ❓ 问题反馈

如果您有任何问题或建议，请通过以下方式联系：

- 开启 GitHub Issue
- 发送邮件至项目维护者

---

**感谢您的贡献！** 🙏