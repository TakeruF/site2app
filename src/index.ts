#!/usr/bin/env node

import { input, select, checkbox, confirm } from "@inquirer/prompts";
import chalk from "chalk";
import ora from "ora";
import fs from "fs-extra";
import path from "path";
import sharp from "sharp";

const URL_REGEX = /^https?:\/\/.+/;
const PACKAGE_ID_REGEX = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*){2,}$/;

const MIPMAP_SIZES: Record<string, number> = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};

interface AppConfig {
  targetUrl: string;
  appName: string;
  packageId: string;
  version: string;
  capacitorVersion: string;
  iconPath: string;
  extraPlugins: string[];
}

const skipConfirm = process.argv.includes("--yes") || process.argv.includes("-y");

async function promptUser(): Promise<AppConfig> {
  console.log(chalk.bold.cyan("\n  Capacitor WebView APK Generator\n"));

  const targetUrl = await input({
    message: "Target URL:",
    validate: (v) => URL_REGEX.test(v) || "Must start with http:// or https://",
  });

  const appName = await input({
    message: "App name:",
    validate: (v) => v.trim().length > 0 || "Required",
  });

  const packageId = await input({
    message: "Package ID (e.g. com.example.myapp):",
    validate: (v) => PACKAGE_ID_REGEX.test(v) || "Must be reverse-domain format (e.g. com.example.myapp)",
  });

  const version = await input({
    message: "Version:",
    default: "1.0.0",
  });

  const capacitorVersion = await select({
    message: "Capacitor version:",
    choices: [
      { name: "6 (latest)", value: "6" },
      { name: "5", value: "5" },
    ],
    default: "6",
  });

  const iconPath = await input({
    message: "App icon path (PNG/JPG, or press Enter to skip):",
    default: "",
  });

  const extraPlugins = await checkbox({
    message: "Extra plugins:",
    choices: [
      { name: "@capacitor/status-bar", value: "@capacitor/status-bar" },
      { name: "@capacitor/splash-screen", value: "@capacitor/splash-screen" },
    ],
  });

  return { targetUrl, appName, packageId, version, capacitorVersion, iconPath, extraPlugins };
}

function printSummary(config: AppConfig): void {
  console.log(chalk.bold("\n  Summary\n"));
  console.log(`  ${chalk.gray("URL:")}          ${config.targetUrl}`);
  console.log(`  ${chalk.gray("App name:")}     ${config.appName}`);
  console.log(`  ${chalk.gray("Package ID:")}   ${config.packageId}`);
  console.log(`  ${chalk.gray("Version:")}      ${config.version}`);
  console.log(`  ${chalk.gray("Capacitor:")}    v${config.capacitorVersion}`);
  console.log(`  ${chalk.gray("Icon:")}         ${config.iconPath || "(default)"}`);
  console.log(`  ${chalk.gray("Plugins:")}      ${config.extraPlugins.length > 0 ? config.extraPlugins.join(", ") : "(none)"}`);
  console.log();
}

function cleanPath(filePath: string): string {
  // Remove surrounding quotes (single or double) from copy-paste
  let cleaned = filePath.trim().replace(/^['"]|['"]$/g, "");
  // Expand ~ to home directory
  if (cleaned.startsWith("~/") || cleaned === "~") {
    cleaned = path.join(process.env.HOME || process.env.USERPROFILE || "", cleaned.slice(1));
  }
  return cleaned;
}

async function processIcon(config: AppConfig, outputDir: string): Promise<boolean> {
  if (!config.iconPath) return false;

  const absIconPath = path.resolve(cleanPath(config.iconPath));
  if (!await fs.pathExists(absIconPath)) {
    console.log(chalk.yellow(`\n  Warning: Icon file not found at ${absIconPath}, skipping icon processing.`));
    return false;
  }

  try {
    const iconDir = path.join(outputDir, "icon");
    const androidIconDir = path.join(iconDir, "android");
    await fs.ensureDir(androidIconDir);

    // Resize to 1024x1024 master icon
    await sharp(absIconPath).resize(1024, 1024).png().toFile(path.join(iconDir, "icon.png"));

    // Generate Android mipmap sizes
    for (const [folder, size] of Object.entries(MIPMAP_SIZES)) {
      const dir = path.join(androidIconDir, folder);
      await fs.ensureDir(dir);
      await sharp(absIconPath).resize(size, size).png().toFile(path.join(dir, "ic_launcher.png"));
      await sharp(absIconPath).resize(size, size).png().toFile(path.join(dir, "ic_launcher_round.png"));
    }

    return true;
  } catch (err) {
    console.log(chalk.yellow(`  Warning: Icon processing failed (${err}), skipping.`));
    return false;
  }
}

function generateCapacitorConfig(config: AppConfig): string {
  return JSON.stringify(
    {
      appId: config.packageId,
      appName: config.appName,
      webDir: "public",
      server: {
        url: config.targetUrl,
        cleartext: true,
        androidScheme: "https",
      },
      android: {
        allowMixedContent: true,
      },
    },
    null,
    2
  );
}

function generateIndexHtml(config: AppConfig): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.appName}</title>
  <script>
    window.location.href = "${config.targetUrl}";
  </script>
</head>
<body>
  <p>Redirecting to <a href="${config.targetUrl}">${config.targetUrl}</a>...</p>
</body>
</html>
`;
}

function generateSetupSh(config: AppConfig, hasIcon: boolean): string {
  const capVersion = config.capacitorVersion;
  const packages = [
    `@capacitor/core@${capVersion}`,
    `@capacitor/cli@${capVersion}`,
    `@capacitor/android@${capVersion}`,
    ...config.extraPlugins,
  ];

  const iconCopySteps = hasIcon
    ? `
# Copy icon files to Android resource directories
echo "Copying app icons..."
RES_DIR="android/app/src/main/res"

# Remove adaptive icon definitions (these override our PNGs on Android 8+)
rm -rf "\${RES_DIR}/mipmap-anydpi-v26"
echo "  Removed mipmap-anydpi-v26 (adaptive icon XMLs)"

# Remove vector foreground/background XMLs that override PNGs
rm -f "\${RES_DIR}/drawable-v24/ic_launcher_foreground.xml"
rm -f "\${RES_DIR}/drawable/ic_launcher_background.xml"
rm -f "\${RES_DIR}/values/ic_launcher_background.xml"
echo "  Removed adaptive icon foreground/background XMLs"

# Copy our PNGs into each mipmap density directory
for density in mipmap-mdpi mipmap-hdpi mipmap-xhdpi mipmap-xxhdpi mipmap-xxxhdpi; do
  src_dir="icon/android/\${density}"
  dest_dir="\${RES_DIR}/\${density}"
  if [ -d "\${src_dir}" ]; then
    mkdir -p "\${dest_dir}"
    cp "\${src_dir}/ic_launcher.png" "\${dest_dir}/ic_launcher.png"
    cp "\${src_dir}/ic_launcher_round.png" "\${dest_dir}/ic_launcher_round.png"
    # Remove the foreground PNG (no longer needed without adaptive icons)
    rm -f "\${dest_dir}/ic_launcher_foreground.png"
    echo "  Copied icons to \${dest_dir}"
  fi
done
`
    : "";

  return `#!/usr/bin/env bash
set -euo pipefail

echo "=== ${config.appName} - Project Setup ==="
echo ""

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Error: node is required but not installed."; exit 1; }
command -v npx  >/dev/null 2>&1 || { echo "Error: npx is required but not installed."; exit 1; }
command -v java >/dev/null 2>&1 || { echo "Error: java is required but not installed (JDK 17+ recommended)."; exit 1; }

echo "Prerequisites OK."
echo ""

# Initialize npm project
echo "Initializing npm project..."
npm init -y

# Install Capacitor packages
echo "Installing Capacitor packages..."
npm install ${packages.join(" ")}

# Capacitor config and web assets are already in place (generated by capacitor-apk-gen)

# Add Android platform
echo "Adding Android platform..."
npx cap add android

# Sync
echo "Syncing..."
npx cap sync android
${iconCopySteps}
echo ""
echo "=== Setup complete! ==="
echo ""
echo "Next steps:"
echo "  1. cd ${config.appName}  (if not already there)"
echo "  2. bash build.sh"
echo "  3. Find your APK at: android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
`;
}

function generateBuildSh(config: AppConfig): string {
  return `#!/usr/bin/env bash
set -euo pipefail

echo "=== Building ${config.appName} APK ==="
echo ""

if [ ! -d "android" ]; then
  echo "Error: android/ directory not found. Run setup.sh first."
  exit 1
fi

cd android
./gradlew assembleDebug

echo ""
echo "=== Build complete! ==="
echo "APK location: android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
`;
}

function generateReadme(config: AppConfig): string {
  return `# ${config.appName}

A Capacitor WebView wrapper for [${config.targetUrl}](${config.targetUrl}).

Generated by **capacitor-apk-gen**.

## Prerequisites

- **Node.js** 18+
- **JDK** 17+
- **Android Studio** (for SDK and build tools)
- **ANDROID_HOME** environment variable set (e.g. \`~/Android/Sdk\`)

## Setup

\`\`\`bash
bash setup.sh
\`\`\`

This will install dependencies, initialize the Capacitor project, and add the Android platform.

## Build APK

\`\`\`bash
bash build.sh
\`\`\`

The debug APK will be at:

\`\`\`
android/app/build/outputs/apk/debug/app-debug.apk
\`\`\`

## Release Build

To create a signed release APK:

1. Generate a keystore:
   \`\`\`bash
   keytool -genkey -v -keystore release.keystore -alias myapp -keyalg RSA -keysize 2048 -validity 10000
   \`\`\`

2. Create \`android/keystore.properties\`:
   \`\`\`properties
   storeFile=../../release.keystore
   storePassword=YOUR_STORE_PASSWORD
   keyAlias=myapp
   keyPassword=YOUR_KEY_PASSWORD
   \`\`\`

3. Add signing config to \`android/app/build.gradle\` and run:
   \`\`\`bash
   cd android && ./gradlew assembleRelease
   \`\`\`

## App Details

| Field | Value |
|-------|-------|
| Package ID | \`${config.packageId}\` |
| Version | \`${config.version}\` |
| Capacitor | v${config.capacitorVersion} |
`;
}

async function generate(config: AppConfig): Promise<void> {
  const outputDir = path.resolve(process.cwd(), config.appName);

  if (await fs.pathExists(outputDir)) {
    const overwrite = await confirm({
      message: `Directory "${config.appName}" already exists. Overwrite?`,
      default: false,
    });
    if (!overwrite) {
      console.log(chalk.red("Aborted."));
      process.exit(1);
    }
    await fs.remove(outputDir);
  }

  // Process icon before spinner so warnings are visible
  const hasIcon = await processIcon(config, outputDir);

  const spinner = ora("Generating project files...").start();

  try {
    // Create directories
    await fs.ensureDir(path.join(outputDir, "public"));

    // Write files
    spinner.text = "Writing project files...";

    await fs.writeFile(path.join(outputDir, "capacitor.config.json"), generateCapacitorConfig(config));
    await fs.writeFile(path.join(outputDir, "public", "index.html"), generateIndexHtml(config));
    await fs.writeFile(path.join(outputDir, "setup.sh"), generateSetupSh(config, hasIcon), { mode: 0o755 });
    await fs.writeFile(path.join(outputDir, "build.sh"), generateBuildSh(config), { mode: 0o755 });
    await fs.writeFile(path.join(outputDir, "README.md"), generateReadme(config));

    spinner.succeed("Project generated successfully!");
  } catch (err) {
    spinner.fail("Generation failed.");
    throw err;
  }

  console.log();
  console.log(chalk.green.bold("  Done!") + " Your project is ready at:");
  console.log(chalk.cyan(`  ./${config.appName}/`));
  console.log();
  console.log(chalk.bold("  Next steps:"));
  console.log(`  ${chalk.gray("$")} cd ${config.appName}`);
  console.log(`  ${chalk.gray("$")} bash setup.sh`);
  console.log(`  ${chalk.gray("$")} bash build.sh`);
  console.log();
  console.log(
    chalk.gray("  APK will be at: android/app/build/outputs/apk/debug/app-debug.apk")
  );
  console.log();
}

async function main(): Promise<void> {
  try {
    const config = await promptUser();
    printSummary(config);

    if (!skipConfirm) {
      const proceed = await confirm({ message: "Generate project?", default: true });
      if (!proceed) {
        console.log(chalk.red("Aborted."));
        process.exit(0);
      }
    }

    await generate(config);
  } catch (err) {
    if ((err as { name?: string }).name === "ExitPromptError") {
      console.log(chalk.gray("\nAborted."));
      process.exit(0);
    }
    console.error(chalk.red(`\nError: ${err}`));
    process.exit(1);
  }
}

main();
