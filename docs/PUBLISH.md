# 发布指南(Publish Guide)

本文描述如何把本项目发布到 GitHub 并符合开源惯例。所有命令在项目根目录执行。

## 0. 发布前隐私自查

- [x] 全部数据文件已扫描:无邮箱、电话、即时通讯账号、本地路径
- [x] 数据中不含贡献者个人信息(作者字段为 "Community" / "HOPE Contributors")
- [ ] **提交 git 时使用 GitHub 提供的匿名邮箱**,避免真实邮箱进入公开提交历史:
      GitHub → Settings → Emails → 找到 `<数字>+<用户名>@users.noreply.github.com`,提交时用它

```bash
# 仅对本仓库生效的匿名提交身份(推荐)
git config user.name  "<你的GitHub用户名>"
git config user.email "<数字>+<用户名>@users.noreply.github.com"
```

## 1. 初始化本地仓库

```bash
git init -b main
git add .
git commit -m "HOPE v0.2.0: formal release"
```

## 2. 创建 GitHub 仓库

在 <https://github.com/new> 创建:

| 设置项 | 建议值 |
|--------|--------|
| Repository name | `HOPE` |
| Description | Open dataset: Chinese companies going global — overseas factories, M&A, joint ventures and supply-chain deals in the US, Germany, Japan, Brazil and 40+ countries, every record sourced | 企业出海与海外合作关系开放数据集：海外建厂/并购/合资/供货，覆盖美日德等 40 多国，每条附公开来源 |
| 可见性 | Public |
| Initialize this repository | **全部不勾选**(本地已有 README/LICENSE) |

## 3. 推送

```bash
git remote add origin git@github.com:<用户名>/HOPE.git
git push -u origin main
```

推送后替换 `package.json` 中 `repository.url` 的 `your-username` 占位符并提交。

## 4. 仓库元数据

- **About(侧栏描述)**(≤350 字符,名称+描述+topics 是 GitHub 搜索仅有的三个索引面;中文短语与英文国家词都放这里):
  ```text
  Open dataset: Chinese companies going global — overseas factories, M&A, joint ventures and supply-chain deals in the US, Germany, Japan, Brazil and 40+ countries, every record sourced | 企业出海与海外合作关系开放数据集：海外建厂/并购/合资/供货，覆盖美日德等 40 多国，每条附公开来源
  ```
- **Topics 建议(20 个,为 GitHub 上限)**。括号内为该 topic 在 GitHub 的仓库总量(池子越小越容易排到第一页;实测于 2026-09):
  `hope` `dataset` `open-data` `chinese-companies`(2) `china`(1768) `united-states`(608) `germany`(1170) `japan`(1361) `brazil`(1967) `vietnam`(606) `thailand`(427) `india` `indonesia` `hungary`(99) `mexico`(819) `italy`(616) `hong-kong`(238) `fdi`(33) `supply-chain`(4668) `mergers-and-acquisitions`(102)
  - 说明:`chinese-companies` `fdi` `hungary` `mergers-and-acquisitions` 池子极小,基本稳居首位;`united-states` 比 `usa` 池大且更常用,二者不重复占用(描述里已含 "US" 字样兜底自由搜索);`open-source` `directory` `business-partnerships` 等旧 tag 与数据主题弱相关,已让位给国家 tag。
- **开启**:Issues(接收数据勘误)、Discussions(可选,用于数据讨论)
- **Social preview**(可选):上传 1280×640 图片

## 5. 版本发布

```bash
git tag -a v0.2.0 -m "v0.2.0"
git push origin v0.2.0
```

在 GitHub Releases 页面基于 tag 发布,说明文字可直接引用 `CHANGELOG.md`。
CITATION.cff 已就绪,GitHub 会在 "Cite this repository" 中展示引用信息。

## 6. 许可证说明

本项目采用 **Anti-996 License**(见 LICENSE 文件)。该许可证不在 SPDX 标准列表中,因此:

- GitHub 仓库许可证徽标会显示为 **"Other"**,属正常现象;
- `package.json` 中 `"license": "Anti-996"` 为自定义字符串,同样正常;
- 如需换用 SPDX 标准许可证(如 MIT / CC0-1.0),需重写 LICENSE 并同步 README、package.json、CITATION.cff。

## 7. 日常维护礼仪

- 数据改动必须过 `npm run validate`(CI 会在 PR 上自动执行)
- 新增关系必须附公开来源 URL
- 定期从 issue/PR 合并社区勘误,并在 `CHANGELOG.md` 记录
- 数据变化后运行 `npm run docs` 同步《企业合作关系一览》与 README 核心企业节
- 数据规模变化后运行 `npm run stats` 同步 README 中的统计数字
