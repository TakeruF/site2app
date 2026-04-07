# site2app — WebサイトをAndroidアプリに変換するツール

お気に入りのWebサイトのURLを入力するだけで、Androidアプリ（APKファイル）を作るためのプロジェクトを自動生成します。

---

## このツールでできること

任意のWebサイトを「WebView」というブラウザ機能で表示するAndroidアプリを作れます。  
たとえば、自分のブログや社内ツールをアプリ化したいときに便利です。

---

## 事前に必要なもの

以下のソフトウェアをインストールしてください。  
すべて無料で利用できます。

### 1. Node.js（バージョン18以上）

JavaScriptの実行環境です。このツール自体の動作に必要です。

- 公式サイト: https://nodejs.org/ja
- 「LTS（推奨版）」をダウンロードしてインストールしてください
- インストール後、ターミナルで確認：
  ```
  node --version
  ```
  `v18.x.x` 以上が表示されればOKです

### 2. JDK（Java Development Kit、バージョン17以上）

Androidアプリのビルドに必要です。

- **macOS の場合：**
  ```
  brew install openjdk@17
  ```
  Homebrew がない場合は先に https://brew.sh/ja からインストールしてください

- **Windows の場合：**
  https://adoptium.net/ から Temurin 17 をダウンロードしてインストール

- インストール後、ターミナルで確認：
  ```
  java --version
  ```
  `17.x.x` 以上が表示されればOKです

### 3. Android Studio

Androidの開発環境です。SDKとビルドツールを入手するために必要です。

- 公式サイト: https://developer.android.com/studio
- インストール後、初回起動時に「Standard」セットアップを選ぶと必要なものが自動でインストールされます

### 4. ANDROID_HOME 環境変数の設定

Android SDK の場所をシステムに教える必要があります。

- **macOS の場合：**  
  ターミナルで以下を実行（`~/.zshrc` に追記されます）：
  ```
  echo 'export ANDROID_HOME="$HOME/Library/Android/sdk"' >> ~/.zshrc
  echo 'export PATH="$ANDROID_HOME/platform-tools:$PATH"' >> ~/.zshrc
  source ~/.zshrc
  ```

- **Windows の場合：**  
  「システム環境変数」で `ANDROID_HOME` を `C:\Users\<ユーザー名>\AppData\Local\Android\Sdk` に設定してください

---

## 使い方

### ステップ 1：このツールをダウンロード

ターミナル（macOS）またはコマンドプロンプト/PowerShell（Windows）を開いて、以下を実行します：

```bash
git clone https://github.com/TakeruF/site2app.git
cd site2app
```

> **ターミナルの開き方：**
> - **macOS：** Spotlight（Cmd + Space）で「ターミナル」と検索して起動
> - **Windows：** スタートメニューで「PowerShell」と検索して起動

### ステップ 2：ツールをセットアップ

```bash
npm install
npm run build
```

### ステップ 3：ツールを実行

```bash
npm start
```

対話形式で質問が表示されるので、順番に答えていきます：

```
? Target URL:                → アプリにしたいサイトのURL（例: https://example.com）
? App name:                  → アプリの名前（例: MyApp）
? Package ID:                → アプリの識別子（例: com.example.myapp）
? Version:                   → バージョン（そのままEnterで 1.0.0）
? Capacitor version:         → そのままEnterで OK
? App icon path:             → アイコン画像のパス（なければそのままEnter）
? Extra plugins:             → 追加プラグイン（不要ならそのままEnter）
```

> **Package ID とは？**  
> アプリを一意に識別するための名前で、`com.会社名.アプリ名` のような形式です。  
> 例: `com.tanaka.myblog`、`jp.example.toolapp`  
> 英小文字・数字のみ、ドットで3つ以上に区切ってください。

確認画面が出たら `Y` を押してEnterで生成されます。

### ステップ 4：生成されたプロジェクトをセットアップ

```bash
cd <アプリ名>
bash setup.sh
```

> `<アプリ名>` は、ステップ3で入力した App name に置き換えてください。  
> 例: `cd MyApp`

数分かかることがあります。完了まで待ってください。

### ステップ 5：APKをビルド

```bash
bash build.sh
```

初回は数分かかります。

### ステップ 6：APKファイルを取り出す

ビルドが成功すると、以下の場所にAPKファイルが生成されます：

```
android/app/build/outputs/apk/debug/app-debug.apk
```

このファイルをAndroidスマホに転送してインストールすれば、アプリとして使えます。

> **スマホへの転送方法：**
> - USBケーブルで接続してファイルをコピー
> - Google ドライブにアップロードしてスマホからダウンロード
> - メールに添付して送信

> **インストール時の注意：**  
> 「提供元不明のアプリ」のインストールを許可する必要があります。  
> スマホの設定 → セキュリティ → 「不明なアプリのインストール」を有効にしてください。

---

## アプリアイコンを設定する場合

ステップ3の `App icon path` で PNG または JPG 画像のパスを指定すると、自動的にリサイズされてアプリアイコンとして設定されます。

正方形の画像（512x512 以上推奨）を用意してください。

ファイルパスの例：
- macOS: `/Users/tanaka/Desktop/icon.png`
- Windows: `C:\Users\tanaka\Desktop\icon.png`

---

## 拡張機能（Extra plugins）について

ステップ3の `Extra plugins` で、アプリに追加機能を組み込むことができます。  
スペースキーで選択/解除し、Enterで確定します（何も選ばずEnterでスキップ可）。

### @capacitor/status-bar

スマホ画面上部の **ステータスバー**（時刻やバッテリーが表示されている部分）の見た目を制御できます。

- ステータスバーの色を変更する
- ステータスバーを非表示にして全画面表示にする
- 文字色を白/黒に切り替える

アプリのデザインに合わせてステータスバーをカスタマイズしたい場合に選択してください。  
特にこだわりがなければ不要です。

### @capacitor/splash-screen

アプリ起動時に表示される **スプラッシュスクリーン**（起動画面）を制御できます。

- 起動画面の表示時間を調整する
- 起動画面のフェードアウトを設定する
- プログラムから起動画面を非表示にする

Webサイトの読み込みに時間がかかる場合、ロゴ入りの起動画面を表示しておくと見た目がよくなります。  
読み込みが速いサイトであれば不要です。

### プラグインの設定方法

プラグインを選択した場合、`setup.sh` の実行時に自動でインストールされます。  
プラグインの動作を細かく設定するには、生成されたプロジェクト内の `capacitor.config.json` に設定を追加します。

例（スプラッシュスクリーンを3秒間表示する場合）：

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

詳しい設定項目は各プラグインの公式ドキュメントを参照してください：
- status-bar: https://capacitorjs.com/docs/apis/status-bar
- splash-screen: https://capacitorjs.com/docs/apis/splash-screen

---

## よくあるエラーと対処法

| エラー内容 | 原因と対処 |
|-----------|-----------|
| `command not found: node` | Node.js がインストールされていません。上の手順でインストールしてください |
| `command not found: java` | JDK がインストールされていません。上の手順でインストールしてください |
| `ANDROID_HOME is not set` | 環境変数の設定が必要です。上の手順を参照してください |
| `SDK location not found` | Android Studio をインストール・起動して SDK をダウンロードしてください |
| `Could not determine java version` | JDK のバージョンが古い可能性があります。JDK 17以上をインストールしてください |

---

## リリース用（署名付き）APKを作りたい場合

Google Play ストアに公開したり、正式に配布するには署名付きAPKが必要です。

1. 署名キーを生成：
   ```bash
   keytool -genkey -v -keystore release.keystore -alias myapp -keyalg RSA -keysize 2048 -validity 10000
   ```

2. `android/app/build.gradle` に署名設定を追加

3. リリースビルドを実行：
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

詳しくは [Android公式ドキュメント](https://developer.android.com/studio/publish/app-signing) を参照してください。

---

## ライセンス

ISC
