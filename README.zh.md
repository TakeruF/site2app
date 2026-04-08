# site2app — 将网站转换为Android应用

只需输入网站URL，即可自动生成构建Android应用（APK文件）所需的项目。

---

## 本工具的功能

利用"WebView"（内嵌浏览器组件）创建一个可以显示任意网站的Android应用。  
适用于将自己的博客、企业内部工具或Web服务打包成原生应用。

---

## 前置要求

请预先安装以下软件，均可免费使用。

### 1. Node.js（18及以上版本）

JavaScript运行环境，本工具运行所必需。

- 官方网站：https://nodejs.org/
- 请下载"LTS（推荐版）"
- 安装后在终端中验证：
  ```
  node --version
  ```
  显示 `v18.x.x` 或更高版本即可。

### 2. JDK（Java开发工具包，17及以上版本）

构建Android应用所必需。

- **macOS：**
  ```
  brew install openjdk@17
  ```
  如果没有Homebrew，请先从 https://brew.sh/ 安装。

- **Windows：**
  从 https://adoptium.net/ 下载 Temurin 17 并安装。

- 安装后验证：
  ```
  java --version
  ```
  显示 `17.x.x` 或更高版本即可。

### 3. Android Studio

Android开发环境，用于获取SDK和构建工具。

- 官方网站：https://developer.android.com/studio
- 首次启动时选择"Standard"设置，将自动安装所有必要组件。

### 4. 设置ANDROID_HOME环境变量

需要告知系统Android SDK的安装位置。

- **macOS：**
  ```
  echo 'export ANDROID_HOME="$HOME/Library/Android/sdk"' >> ~/.zshrc
  echo 'export PATH="$ANDROID_HOME/platform-tools:$PATH"' >> ~/.zshrc
  source ~/.zshrc
  ```

- **Windows：**
  在"系统环境变量"中将 `ANDROID_HOME` 设置为 `C:\Users\<用户名>\AppData\Local\Android\Sdk`。

---

## 使用方法

### 步骤1：下载本工具

打开终端（macOS）或PowerShell（Windows），运行以下命令：

```bash
git clone https://github.com/TakeruF/site2app.git
cd site2app
```

> **如何打开终端：**
> - **macOS：** 按 Cmd + Space，输入"终端"（Terminal）并打开
> - **Windows：** 在开始菜单中搜索"PowerShell"并打开

### 步骤2：安装工具

```bash
npm install
npm run build
```

### 步骤3：运行工具

```bash
npm start
```

系统将以交互方式逐一询问以下信息：

```
? Target URL:                -> 要转换为应用的网站URL（例：https://example.com）
? App name:                  -> 应用名称（例：MyApp）
? Package ID:                -> 应用标识符（例：com.example.myapp）
? Version:                   -> 版本号（直接按Enter默认为 1.0.0）
? Capacitor version:         -> 直接按Enter即可
? App icon path:             -> 图标图片路径（无则直接按Enter跳过）
? Extra plugins:             -> 附加插件（不需要则直接按Enter跳过）
? Open in-app:               -> 在应用内打开的域名（用于登录等，详见下文）
```

> **什么是 Package ID？**  
> 应用的唯一标识符，采用反向域名格式：`com.公司名.应用名`。  
> 例：`com.zhangsan.myblog`、`cn.example.toolapp`  
> 仅使用小写字母、数字和点号，至少由3段组成。

确认界面出现后，按 `Y` 并回车即可生成项目。

### 步骤4：设置生成的项目

```bash
cd <应用名>
bash setup.sh
```

> 将 `<应用名>` 替换为步骤3中输入的App name。  
> 例：`cd MyApp`

此过程可能需要数分钟，请等待完成。

### 步骤5：构建APK

```bash
bash build.sh
```

首次构建可能需要数分钟。

### 步骤6：获取APK文件

构建成功后，APK文件位于：

```
android/app/build/outputs/apk/debug/app-debug.apk
```

将此文件传输到Android手机上安装即可使用。

> **如何传输到手机：**
> - 通过USB数据线连接并复制文件
> - 上传到Google Drive后在手机上下载
> - 作为邮件附件发送

> **安装注意事项：**  
> 需要允许安装"未知来源的应用"。  
> 在手机设置 -> 安全 -> 启用"安装未知应用"。

---

## 设置应用图标

在步骤3的 `App icon path` 提示处提供PNG或JPG图片的路径，图标将自动缩放并设置为应用图标。

请准备正方形图片（推荐512x512或更大）。

文件路径示例：
- macOS：`/Users/yourname/Desktop/icon.png`
- Windows：`C:\Users\yourname\Desktop\icon.png`

---

## 扩展插件（Extra plugins）

在步骤3的 `Extra plugins` 提示处，可以为应用添加附加功能。  
使用空格键选择/取消选择，按Enter确认（不选择直接按Enter可跳过）。

### @capacitor/status-bar

控制手机屏幕顶部**状态栏**（显示时间、电量的区域）的外观。

- 更改状态栏颜色
- 隐藏状态栏以实现全屏显示
- 切换文字颜色（白色/黑色）

如果需要根据应用设计自定义状态栏外观，请选择此插件。  
没有特殊需求则无需选择。

### @capacitor/splash-screen

控制应用启动时显示的**启动画面**。

- 调整启动画面的显示时长
- 设置启动画面的淡出动画
- 通过代码控制启动画面的隐藏

当网站加载时间较长时，显示带有品牌标识的启动画面可以提升用户体验。  
如果网站加载速度很快，则无需选择。

### 插件配置方法

选择插件后，在运行 `setup.sh` 时会自动安装。  
要对插件进行详细配置，请在生成项目中的 `capacitor.config.json` 中添加设置。

示例（显示启动画面3秒）：

```json
{
  "appId": "com.example.myapp",
  "appName": "MyApp",
  "webDir": "public",
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 3000,
      "launchAutoHide": true
    }
  }
}
```

详细配置选项请参阅官方文档：
- status-bar：https://capacitorjs.com/docs/apis/status-bar
- splash-screen：https://capacitorjs.com/docs/apis/splash-screen

---

## 外部链接处理（Open in-app）

在步骤3的 `Open in-app` 提示处，可以选择哪些域名应在应用内（WebView）打开，而非跳转到外部浏览器。

### 默认行为

- **与目标URL相同的域名** — 在应用内打开
- **其他外部域名** — 在默认浏览器中打开
- **特殊链接**（`mailto:`、`tel:` 等）— 委托给操作系统（打开邮件应用、电话应用等）

### 添加登录域名

如果您的网站使用Google或GitHub等外部服务进行登录，需要将这些域名设置为在应用内打开。否则，用户登录后将无法返回应用。

可以通过交互方式选择以下提供商（空格键选择/取消，Enter确认）：

| 提供商 | 域名 |
|--------|------|
| Google | `accounts.google.com` |
| Apple | `appleid.apple.com` |
| GitHub | `github.com` |
| Facebook | `facebook.com` |
| X / Twitter | `x.com`、`twitter.com` |
| Microsoft | `login.microsoftonline.com` |
| LINE | `access.line.me` |
| Discord | `discord.com` |

选择提供商后，还可以用逗号分隔输入自定义域名（例：`auth.example.com, sso.myservice.com`）。

如果不选择任何项直接按Enter，则只有目标域名在应用内打开，其他所有链接都将在外部浏览器中打开。

---

## 常见错误及解决方法

| 错误信息 | 原因和解决方法 |
|---------|--------------|
| `command not found: node` | 未安装Node.js，请按上述步骤安装 |
| `command not found: java` | 未安装JDK，请按上述步骤安装 |
| `ANDROID_HOME is not set` | 需要设置环境变量，请参阅上述步骤 |
| `SDK location not found` | 请安装并启动Android Studio以下载SDK |
| `Could not determine java version` | JDK版本可能过旧，请安装JDK 17或更高版本 |

---

## 创建发布版（签名）APK

如需在Google Play商店上架或正式发布，需要创建签名APK。

1. 生成密钥库：
   ```bash
   keytool -genkey -v -keystore release.keystore -alias myapp -keyalg RSA -keysize 2048 -validity 10000
   ```

2. 在 `android/app/build.gradle` 中添加签名配置

3. 执行发布构建：
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

详情请参阅 [Android官方文档](https://developer.android.com/studio/publish/app-signing)。

---

## 使用须知与免责声明

本工具旨在将**您自己拥有并运营的Web服务**打包为Android应用。

### 适当的使用场景
- 为自己开发和运营的Web应用创建Android包装器
- 将企业内部工具打包为原生应用
- 为自有服务生成分发用APK

### 请勿用于以下用途
- 未经授权包装第三方服务
- 创建冒充其他公司服务的应用
- 对服务条款禁止WebView访问的服务进行包装

### 法律风险
- **计算机欺诈与滥用法（美国）/ 不正当访问禁止法（日本）/ 网络安全法（中国）：**
  未经授权包装有访问限制的服务可能违反相关法律法规，
  无论应用是否被分发
- **著作权法：** 分发包装了第三方内容的应用可能构成著作权侵权
- **应用商店政策：** Google Play和App Store通常不会批准
  仅由WebView构成的应用上架

### 免责声明
对于因使用本工具而产生的任何损害或法律问题，开发者不承担任何责任。
使用者需自行判断并确认其使用的合法性。

---

## 许可证

ISC
