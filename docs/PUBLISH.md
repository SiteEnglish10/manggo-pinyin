# 手动上传到 GitHub

以下命令由你主动执行。当前目录尚未由本项目自动初始化 Git，也没有推送或发布。当前版本为 `1.1.0`；本版已恢复纯文本，发布说明应明确是双行拼音，不是逐字 Ruby。

## 1. 上传哪些文件

源码仓库提交：

```text
.gitignore
README.md
THIRD-PARTY-NOTICES.txt
package.json
package-lock.json
manggo.plugin.json
icon.png
assets/
src/
scripts/
test/
docs/
```

不要提交 `node_modules/`、`dist/`、`preview.html`、`.tmp/`、日志、`.env`、密码和令牌。`.gitignore` 已排除常见生成文件。GitHub 网页直接拖文件不一定遵循 `.gitignore`，因此推荐以下 Git 命令流程。

`dist/` 的安装包应单独放到 GitHub Release，不放源码仓库。`preview.html` 可用 `npm run preview` 重新生成。

## 2. 建立空仓库

登录 GitHub，点击右上角 `+` → `New repository`。名称可用 `manggo-pinyin`，想被其他人使用可选择 Public。这次不要勾选初始化 README、.gitignore 或 License，避免和本地文件产生不同起点。

点击 `Create repository`，复制 HTTPS 地址，例如 `https://github.com/你的用户名/manggo-pinyin.git`。若打算允许别人复用原创代码，可另行选定并添加开源许可证；第三方许可必须保留。

## 3. 检查构建

打开 PowerShell：

```powershell
Set-Location 'D:\projects\ManggoExtentions'
npm.cmd ci
npm.cmd run check
```

应看到测试通过和 `dist/manggo-pinyin-1.1.0.mplugin`。如果失败，先不要上传发行包。

## 4. 初始化并提交源码

以下适用于本目录尚未存在 Git 仓库的首次上传：

```powershell
git init
git branch -M main
git add .gitignore README.md THIRD-PARTY-NOTICES.txt package.json package-lock.json manggo.plugin.json icon.png assets src scripts test docs
git status
git diff --cached --stat
git commit -m "Restore plain text pinyin output with plugin icon"
```

检查暂存文件不包含依赖、构建产物或秘密。若 Git 提示缺少作者信息，先设置本仓库身份，再重试 commit：

```powershell
git config user.name '你的GitHub用户名'
git config user.email '你的GitHub提交邮箱'
```

邮箱可用 GitHub Settings → Emails 中显示的 noreply 邮箱。

## 5. 推送

替换下一条命令中的用户名和仓库名：

```powershell
git remote add origin https://github.com/你的用户名/manggo-pinyin.git
git push -u origin main
```

若弹出登录窗口，按 Git Credential Manager 的浏览器流程登录。不要把密码或令牌写入代码或 URL。若提示 `origin already exists`，先执行 `git remote -v` 查看现有地址，不要盲目覆盖。

若提示远程已有提交，不要强制推送。首次上传推荐步骤 2 创建真正的空仓库；已有历史则先核对并合并。

## 6. 上传可安装文件到 Release

1. 仓库页面 → Releases → Draft a new release。
2. 新建标签 `v1.1.0`，目标选择 `main`。
3. 标题填 `汉字注音 v1.1.0`。
4. 填写说明：恢复双行纯文本，兼容旧版显示设置。此版不宣称支持 Ruby。
5. 上传 `dist/manggo-pinyin-1.1.0.mplugin` 和同名 `.sha256` 文件。
6. 如需协助验证，可额外上传 `dist/manggo-ruby-probe-0.1.0.mplugin`，明确标为诊断工具。
7. 点击 Publish release。

用户应下载 `.mplugin` 附件，而不是 GitHub 自动生成的 Source code ZIP。

发布说明可填写：

```text
离线汉字注音：上行带调拼音、下行原文，恢复纯文本兼容显示。
支持简繁体、词组多音字及自定义读音，无需 API Key，包含插件图标。
已移除 Ruby / Markdown 显示选项，旧配置会自动转为文本输出。
安装后到翻译服务添加“汉字注音（离线）”；旧版升级无需手动修改显示方式。
```

## 7. 仓库介绍与后续更新

在仓库 About 旁的齿轮添加话题 `manggo-plugin`、`pinyin`、`offline`。官方插件指南建议使用 `manggo-plugin` 话题以便索引；实际收录由 Manggo 决定。

后续先修改源码，并按需要同步更新 `package.json` 和 `manggo.plugin.json` 的版本，运行 `npm.cmd install --package-lock-only` 同步锁文件，然后：

```powershell
npm.cmd run check
git add .
git status
git diff --cached --stat
git commit -m "Describe the changes in this version"
git push
```

检查暂存内容后再提交。后续每次更新使用新的版本号，再创建对应的新 Release。

参考：[GitHub 创建项目仓库](https://docs.github.com/en/get-started/start-your-journey/creating-a-repository-for-your-project-on-github)、[GitHub 管理 Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)、[Manggo 插件发布指南](https://github.com/Pylogmon/manggo-plugin)。
