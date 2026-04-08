# site2app — Turn Any Website into an Android App

Simply enter the URL of a website and this tool automatically generates a project to build an Android app (APK file).

---

## What This Tool Does

It creates an Android app that displays any website using a "WebView" (an embedded browser component).  
Useful for turning your own blog, internal tools, or web services into native apps.

---

## Prerequisites

Please install the following software beforehand.  
All are free to use.

### 1. Node.js (version 18 or later)

A JavaScript runtime environment. Required to run this tool.

- Official site: https://nodejs.org/
- Download the "LTS (Recommended)" version
- After installation, verify in your terminal:
  ```
  node --version
  ```
  You should see `v18.x.x` or later.

### 2. JDK (Java Development Kit, version 17 or later)

Required for building Android apps.

- **macOS:**
  ```
  brew install openjdk@17
  ```
  If you don't have Homebrew, install it first from https://brew.sh/

- **Windows:**
  Download Temurin 17 from https://adoptium.net/

- After installation, verify:
  ```
  java --version
  ```
  You should see `17.x.x` or later.

### 3. Android Studio

The Android development environment. Needed to obtain the SDK and build tools.

- Official site: https://developer.android.com/studio
- On first launch, choose "Standard" setup to automatically install all required components.

### 4. Set the ANDROID_HOME Environment Variable

You need to tell the system where the Android SDK is located.

- **macOS:**
  ```
  echo 'export ANDROID_HOME="$HOME/Library/Android/sdk"' >> ~/.zshrc
  echo 'export PATH="$ANDROID_HOME/platform-tools:$PATH"' >> ~/.zshrc
  source ~/.zshrc
  ```

- **Windows:**
  Set `ANDROID_HOME` to `C:\Users\<YourUsername>\AppData\Local\Android\Sdk` in System Environment Variables.

---

## Usage

### Step 1: Download This Tool

Open Terminal (macOS) or PowerShell (Windows) and run:

```bash
git clone https://github.com/TakeruF/site2app.git
cd site2app
```

> **How to open a terminal:**
> - **macOS:** Press Cmd + Space, type "Terminal", and open it
> - **Windows:** Search for "PowerShell" in the Start menu

### Step 2: Set Up the Tool

```bash
npm install
npm run build
```

### Step 3: Run the Tool

```bash
npm start
```

You will be asked a series of questions interactively:

```
? Target URL:                -> The website URL (e.g. https://example.com)
? App name:                  -> Your app's name (e.g. MyApp)
? Package ID:                -> App identifier (e.g. com.example.myapp)
? Version:                   -> Version number (press Enter for 1.0.0)
? Capacitor version:         -> Press Enter for default
? App icon path:             -> Path to an icon image (press Enter to skip)
? Extra plugins:             -> Additional plugins (press Enter to skip)
? Open in-app:               -> Domains to open inside the app (for sign-in, see below)
```

> **What is a Package ID?**  
> A unique identifier for the app in reverse-domain format: `com.company.appname`.  
> Examples: `com.smith.myblog`, `com.example.toolapp`  
> Use only lowercase letters, numbers, and dots, with at least 3 segments.

When the confirmation screen appears, press `Y` and Enter to generate the project.

### Step 4: Set Up the Generated Project

```bash
cd <AppName>
bash setup.sh
```

> Replace `<AppName>` with the App name you entered in Step 3.  
> Example: `cd MyApp`

This may take several minutes. Please wait until it completes.

### Step 5: Build the APK

```bash
bash build.sh
```

The first build may take several minutes.

### Step 6: Get the APK File

Once the build succeeds, the APK file will be at:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

Transfer this file to your Android phone and install it.

> **How to transfer to your phone:**
> - Connect via USB cable and copy the file
> - Upload to Google Drive and download on your phone
> - Send as an email attachment

> **Installation note:**  
> You need to allow installation from "Unknown sources".  
> Go to Settings -> Security -> enable "Install unknown apps".

---

## Setting an App Icon

In Step 3, provide the path to a PNG or JPG image at the `App icon path` prompt, and it will be automatically resized and set as the app icon.

Use a square image (512x512 or larger recommended).

File path examples:
- macOS: `/Users/yourname/Desktop/icon.png`
- Windows: `C:\Users\yourname\Desktop\icon.png`

---

## Extra Plugins

In Step 3, you can select additional plugins at the `Extra plugins` prompt.  
Use the spacebar to select/deselect, and Enter to confirm (press Enter without selecting to skip).

### @capacitor/status-bar

Control the appearance of the **status bar** (the area at the top showing time and battery).

- Change the status bar color
- Hide the status bar for full-screen mode
- Switch text color between white and black

Select this if you want to customize the status bar to match your app's design.  
Not needed if you have no particular preference.

### @capacitor/splash-screen

Control the **splash screen** (the loading screen displayed when the app starts).

- Adjust how long the splash screen is shown
- Configure fade-out animation
- Programmatically hide the splash screen

Useful when the website takes time to load — displaying a branded splash screen improves the user experience.  
Not needed for fast-loading sites.

### Plugin Configuration

When plugins are selected, they are automatically installed during `setup.sh`.  
To fine-tune plugin behavior, add settings to `capacitor.config.json` in the generated project.

Example (show splash screen for 3 seconds):

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

For detailed configuration options, refer to the official documentation:
- status-bar: https://capacitorjs.com/docs/apis/status-bar
- splash-screen: https://capacitorjs.com/docs/apis/splash-screen

---

## External Link Handling (Open in-app)

In Step 3, the `Open in-app` prompt lets you choose which domains should be opened inside the app (WebView) rather than in an external browser.

### Default Behavior

- **Same domain as Target URL** — Opens inside the app
- **Other external domains** — Opens in the default browser
- **Special links** (`mailto:`, `tel:`, etc.) — Delegated to the OS (opens email app, phone app, etc.)

### Adding Sign-in Domains

If your site uses external services like Google or GitHub for sign-in, you need to keep those domains in-app. Otherwise, after signing in, the user won't be able to return to the app.

You can select from the following providers interactively (spacebar to select/deselect, Enter to confirm):

| Provider | Domain |
|----------|--------|
| Google | `accounts.google.com` |
| Apple | `appleid.apple.com` |
| GitHub | `github.com` |
| Facebook | `facebook.com` |
| X / Twitter | `x.com`, `twitter.com` |
| Microsoft | `login.microsoftonline.com` |
| LINE | `access.line.me` |
| Discord | `discord.com` |

If you press Enter without selecting any, only the target domain will open in-app and all other links will open in the external browser.

---

## Common Errors and Solutions

| Error | Cause and Solution |
|-------|-------------------|
| `command not found: node` | Node.js is not installed. Follow the installation steps above. |
| `command not found: java` | JDK is not installed. Follow the installation steps above. |
| `ANDROID_HOME is not set` | The environment variable needs to be configured. See the steps above. |
| `SDK location not found` | Install and launch Android Studio to download the SDK. |
| `Could not determine java version` | Your JDK version may be too old. Install JDK 17 or later. |

---

## Creating a Release (Signed) APK

To publish on the Google Play Store or distribute officially, you need a signed APK.

1. Generate a keystore:
   ```bash
   keytool -genkey -v -keystore release.keystore -alias myapp -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Add signing configuration to `android/app/build.gradle`

3. Run the release build:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

For more details, see the [Android official documentation](https://developer.android.com/studio/publish/app-signing).

---

## Usage Notice & Disclaimer

This tool is designed for the purpose of packaging **web services that you own and operate** as Android applications.

### Appropriate Use Cases
- Creating an Android wrapper for a web app you develop and operate
- Turning internal intranet tools into native apps
- Generating APKs for distribution of your own services

### Do Not Use For
- Wrapping third-party services without authorization
- Creating apps that impersonate other companies' services
- Targeting services whose terms of service prohibit WebView access

### Legal Risks
- **Computer Fraud and Abuse Act (US) / Unauthorized Computer Access Law (Japan):**
  Wrapping access-restricted services without authorization may violate these laws,
  regardless of whether the app is distributed
- **Copyright Law:** Distributing apps that wrap third-party content may constitute
  copyright infringement
- **Store Policies:** Google Play and the App Store generally do not approve
  apps that consist solely of a WebView

### Disclaimer
The developer assumes no responsibility for any damages or legal issues arising from
the use of this tool. Users are solely responsible for ensuring the legality of their
use.

---

## License

ISC
