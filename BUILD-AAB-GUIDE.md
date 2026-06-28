# Complete Guide: Build & Submit CoinDrop AAB to Google Play Store

## Prerequisites Check
Before starting, verify you have:
- [ ] Java 17+ installed (`java -version`)
- [ ] Android SDK 35 installed
- [ ] Android Studio (latest) OR Gradle 8.6+
- [ ] Node.js 18+ (`node --version`)
- [ ] npm 9+ (`npm --version`)
- [ ] 4GB free disk space (Android SDK takes 3-4GB)
- [ ] Google Play Developer account ($25 one-time fee)
- [ ] Valid payment method on Google Play account

### Install Android SDK (If Needed)
**Windows**:
```bash
# Download Android Studio from https://developer.android.com/studio
# Run installer, select "Android SDK" during setup
# Or use command line:
C:\Android\cmdline-tools\latest\bin\sdkmanager "platforms;android-35" "build-tools;35.0.0"
```

**Mac/Linux**:
```bash
# Using brew:
brew install android-sdk
# Or download from https://developer.android.com/studio
```

Set `ANDROID_SDK_ROOT`:
```bash
# Add to ~/.bashrc or ~/.zshrc:
export ANDROID_SDK_ROOT=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_SDK_ROOT/emulator:$ANDROID_SDK_ROOT/tools/bin:$ANDROID_SDK_ROOT/platform-tools
```

---

## Step 1: Set Up Capacitor Project (First Time Only)

### 1.1 Install Dependencies
```bash
cd C:\Users\demar\Documents\GitHub\coindrop

# Install npm packages
npm install

# Install Capacitor CLI globally (optional, recommended)
npm install -g @capacitor/cli
```

### 1.2 Add Android Platform
```bash
# Add Android support (one-time)
npx capacitor add android

# This creates:
# - android/ (native Android project)
# - android/app/src/main/AndroidManifest.xml
# - android/app/build.gradle
# - android/settings.gradle
```

### 1.3 Sync Web Assets
```bash
# Copy web files to Android assets
npx capacitor sync android

# OR if you only changed native code:
npx capacitor copy android
```

---

## Step 2: Generate Signing Key (One-Time)

### 2.1 Create Release Keystore
**WARNING**: Losing this keystore = cannot update app forever. Backup securely!

```bash
# Create keystore for signing APK/AAB
keytool -genkey -v \
  -keystore release.keystore \
  -alias coindrop_key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "CN=CoinDrop,O=Illy Robotic Instruments,L=Buffalo,ST=NY,C=US" \
  -storepass YourStrongPassword123! \
  -keypass YourStrongPassword123!

# Output: release.keystore (keep this safe!)
```

### 2.2 Back Up the Keystore
```bash
# CRITICAL: Back up to secure location
cp release.keystore ~/Dropbox/coindrop-keystore-backup.keystore
# OR save to encrypted USB drive

# DO NOT commit to git!
echo "release.keystore" >> .gitignore
```

### 2.3 Store Signing Credentials
**Windows** (secure file):
```bash
# Create signing config file (NOT in git!)
cat > android/signing.properties << EOF
storeFile=../release.keystore
storePassword=YourStrongPassword123!
keyAlias=coindrop_key
keyPassword=YourStrongPassword123!
EOF

# Protect file
icacls android/signing.properties /grant:r "%username%:F" /inheritance:r
```

**Mac/Linux**:
```bash
cat > android/signing.properties << EOF
storeFile=../release.keystore
storePassword=YourStrongPassword123!
keyAlias=coindrop_key
keyPassword=YourStrongPassword123!
EOF

chmod 600 android/signing.properties
```

---

## Step 3: Configure Build Signing

### 3.1 Update build.gradle
The android/ folder contains `app/build.gradle.kts`. Ensure it includes:

```kotlin
signingConfigs {
    release {
        val props = Properties()
        props.load(project.rootDir.resolve("signing.properties").inputStream())
        
        storeFile = file(props.getProperty("storeFile"))
        storePassword = props.getProperty("storePassword")
        keyAlias = props.getProperty("keyAlias")
        keyPassword = props.getProperty("keyPassword")
    }
}

buildTypes {
    release {
        signingConfig = signingConfigs.release
        isMinifyEnabled = true
        proguardFiles(
            getDefaultProguardFile("proguard-android-optimize.txt"),
            "proguard-rules.pro"
        )
    }
}
```

---

## Step 4: Build Release AAB

### 4.1 Open in Android Studio (Recommended for First Build)
```bash
npx capacitor open android
# Opens Android Studio with native project
```

**In Android Studio**:
1. Menu: Build → Generate Signed Bundle / APK
2. Choose "Bundle (Android App Bundle)"
3. Choose "release" variant
4. Select keystore: `release.keystore`
5. Enter password: `YourStrongPassword123!`
6. Build type: Release
7. Optimization: Check "V2 Signature"
8. Click "Finish" and wait for build (~3-5 min)

**Output**: `android/app/release/app-release.aab`

### 4.2 Build from Command Line (Automated)
```bash
cd android

# Build release bundle
./gradlew bundleRelease \
  -Dorg.gradle.java.home="C:\Program Files\Java\jdk-17"

# On Mac/Linux:
./gradlew bundleRelease
```

**Output**: `app/build/outputs/bundle/release/app-release.aab`

### 4.3 Verify Build Success
```bash
# Check AAB file exists and has size
ls -lh app/build/outputs/bundle/release/app-release.aab

# Expected: 5-15 MB
```

---

## Step 5: Test on Device (Highly Recommended)

### 5.1 Use Android Studio Test Build
1. Android Studio → Build → Build Bundle(s) / APK(s) → Build APKs
2. Connect Android device or open emulator
3. Run → app (or Shift+F10)
4. Test full app flow:
   - Login screen loads
   - Discord auth works
   - Dashboard displays
   - Task cards visible
   - Mobile responsive works
   - No crashes for 5 minutes

### 5.2 Generate APK for Testing
```bash
cd android
./gradlew assembleRelease

# Output: app/build/outputs/apk/release/app-release.apk (~5MB)

# Install on device:
adb install app/build/outputs/apk/release/app-release.apk

# Uninstall for cleanup:
adb uninstall com.coindrop.app
```

---

## Step 6: Set Up Google Play Developer Account

### 6.1 Create Account
1. Go to https://play.google.com/console
2. Sign in with Google account
3. Pay $25 one-time developer fee
4. Complete profile:
   - Developer name: "Illy Robotic Instruments"
   - Contact email: support@illyrobotic-ai.com
   - Website: https://illyrobotic-ai.com
   - Address: (your business address)

### 6.2 Create App
1. Click "Create App"
2. Name: "CoinDrop"
3. Default language: English
4. Category: Finance → Fintech
5. Content rating: Ages 3+
6. Paid/free: Free
7. Click "Create"

---

## Step 7: Prepare Store Listing

### 7.1 App Title & Description
**Title**: `CoinDrop` (50 chars max)

**Short Description** (80 chars max):
```
Turn your screen time into Solana
```

**Full Description** (4000 chars max):
```
CoinDrop lets you earn Solana just by watching YouTube and engaging on social media.

FEATURES:
✓ Watch YouTube videos for rewards
✓ Like and comment on Instagram posts
✓ Subscribe to channels for passive income
✓ Compete on the global leaderboard
✓ Get paid daily to your Phantom wallet
✓ 190+ countries supported
✓ No minimum withdrawal
✓ Free to join

EARNING OPPORTUNITIES:
• Watch YouTube: $0.01 per video
• Like Instagram: $0.005 per like
• Leave comments: $0.02 per comment
• Subscribe: $0.05 upfront + $0.01/month residual

HOW IT WORKS:
1. Sign in with Discord
2. Connect your Phantom Solana wallet
3. Complete tasks (watch, like, comment, subscribe)
4. Get paid in real Solana daily

REQUIREMENTS:
• Age 13+ (18+ recommended for crypto)
• Discord account
• Phantom wallet (free)
• Stable internet connection
• YouTube and/or Instagram account

SECURITY:
✓ Secure Discord OAuth authentication
✓ Encrypted wallet management
✓ All data encrypted at rest
✓ No passwords stored
✓ Regular security audits

Support & Feedback: support@illyrobotic-ai.com
Discord Community: https://discord.gg/847XjyVa3C
Website: https://illyrobotic-ai.com

*CoinDrop is not affiliated with YouTube, Instagram, Discord, or Solana Foundation.*
```

### 7.2 Release Notes
```
CoinDrop v1.0.0 - Initial Release

🎉 Introducing CoinDrop!

Turn your screen time into Solana with just three simple actions:
• Watch YouTube videos
• Like and comment on Instagram
• Subscribe to channels

📊 Track your earnings with our real-time leaderboard
💰 Get paid daily in Solana to your Phantom wallet
🌍 Available in 190+ countries
✨ 100% free to join

Join thousands of earners worldwide. Start earning today!

Support: support@illyrobotic-ai.com
Discord: https://discord.gg/847XjyVa3C
```

---

## Step 8: Upload to Google Play Console

### 8.1 Upload AAB File
1. Go to Google Play Console → CoinDrop
2. Left menu: "Release" → "Production"
3. Click "Create new release"
4. Drag & drop: `app-release.aab` file
5. Review app bundle info (should auto-populate)
6. Click "Next"

### 8.2 Fill In Mandatory Fields
**Store Listing** tab:
- [ ] App title: "CoinDrop"
- [ ] Short description: "Turn your screen time into Solana"
- [ ] Full description: (paste from Step 7.1)
- [ ] Screenshots: Upload 2-5 phone screenshots (1080×1920)
- [ ] Feature graphic: Upload 1024×500 PNG
- [ ] App icon: 512×512 PNG
- [ ] Category: Finance → Fintech
- [ ] Content rating: Complete questionnaire
- [ ] Privacy policy URL: https://your-site.com/privacy
- [ ] Terms of service: https://your-site.com/terms

**Content Rating Questionnaire**:
1. Mature audiences: No
2. Violence: None
3. Sexual content: None
4. Profanity: None
5. Alcohol/tobacco/drugs: None
6. Gambling: No
7. Personal sensitive info: Email, wallet (disclose)
8. Submit for rating

**Target Audience & Content**:
- Primary audience: 18+
- Content guidelines: Finance/Crypto app
- Installs & redirects: None
- Ads: No

**Pricing & Distribution**:
- Type: Free
- Distribute in all countries
- Require authentication: Yes (Discord)

**Contact Details**:
- Email: dwilson@illyrobotic-ai.com
- Phone: (optional)
- Website: https://illyrobotic-ai.com

### 8.3 Review & Submit
1. Review all fields (red = required)
2. Review compliance:
   - [ ] No ads with misleading claims
   - [ ] Crypto properly disclosed
   - [ ] Privacy policy linked
   - [ ] No malware/security issues
3. Click "Save" then "Review release"
4. Final check for errors
5. Click "Start rollout to production"

### 8.4 Rollout Strategy
**First release**: Start with "Staged rollout"
1. Release to 5% of users first
2. Monitor for crashes (Google Play Console → Crashes & ANRs)
3. If no issues for 24 hours, increase to 25%, then 100%
4. Full rollout typically takes 2-3 hours to propagate

---

## Step 9: Monitor Release

### 9.1 Check Release Status
1. Google Play Console → Release → Production
2. Watch rollout percentage increase
3. "Release is live" = success!

### 9.2 Monitor for Crashes
1. Google Play Console → Vitals → Crashes & ANRs
2. Set up alerts for crash rate > 1%
3. Expected: <0.1% crash rate
4. If crashes spike: revert release

### 9.3 Check Install Metrics
1. Stats → Overview
2. First installs should appear within 4-6 hours
3. Monitor daily installs and uninstall rate
4. Respond to reviews within 48 hours

---

## Future Updates: Version Bumping

### Increment Version
When you make changes and want to release v1.0.1:

```bash
# Edit android/app/build.gradle.kts:
# Change versionCode: 1 → 2
# Change versionName: "1.0.0" → "1.0.1"

# Rebuild AAB
cd android
./gradlew bundleRelease

# Upload to Play Console (same process as Step 8)
```

---

## Troubleshooting

### Build Fails: "SDK not found"
```bash
export ANDROID_SDK_ROOT=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_SDK_ROOT/tools/bin
# Then retry build
```

### Build Fails: "Java version mismatch"
```bash
# Ensure Java 17+
java -version

# Set JAVA_HOME explicitly:
export JAVA_HOME=/path/to/java17
./gradlew bundleRelease
```

### Build Takes Too Long
- First build: 5-10 min (normal)
- Subsequent: 1-3 min (cached)
- Increase Gradle heap: `org.gradle.jvmargs=-Xmx2048m`

### Signing Fails
- Verify keystore exists: `ls -l release.keystore`
- Verify password is correct in `signing.properties`
- Regenerate keystore if lost: `keytool -genkey -v ...`

### "App not installable"
- Check min API level (should be 26+)
- Check target API (should be 35)
- Test on Android 8.0+ device

### Play Console Rejects AAB
- Check: compileSdkVersion = 35
- Check: targetSdkVersion = 35
- Check: minSdkVersion = 26
- Rebuild and resubmit

---

## Security Checklist

- [ ] Keystore backed up offline (USB/encrypted cloud)
- [ ] Keystore NOT in git repo (.gitignore added)
- [ ] signing.properties NOT in git repo
- [ ] Password is 16+ chars, strong
- [ ] Privacy policy live at https URL
- [ ] No hardcoded API keys in code
- [ ] Firebase rules configured for security
- [ ] Solana testnet wallet used for testing only
- [ ] Mainnet wallet confirmed before production release

---

## Final Checklist Before Go-Live

- [ ] AAB built and tested on device
- [ ] No crashes in 10-minute app test
- [ ] Mobile responsive verified (360px, 480px, 1080px widths)
- [ ] All features work on mobile
- [ ] Privacy policy URL live and accessible
- [ ] Terms of service URL live and accessible
- [ ] App icon 512×512 PNG created
- [ ] Feature graphic 1024×500 PNG created
- [ ] 2+ app screenshots created (1080×1920)
- [ ] App title ≤ 50 chars
- [ ] Short description ≤ 80 chars
- [ ] Full description ≤ 4000 chars
- [ ] Google Play Developer account created
- [ ] $25 developer fee paid
- [ ] Content rating questionnaire completed
- [ ] Category set to Finance → Fintech
- [ ] Rollout set to staged (5% first)
- [ ] Team notified of live date
- [ ] Support email monitored
- [ ] Discord server ready for user questions

---

## After Launch: First Week Actions

- [ ] Monitor Google Play Console daily
- [ ] Check crash reports every 6 hours
- [ ] Respond to all reviews
- [ ] Monitor Discord for user issues
- [ ] Track install rate and user retention
- [ ] Check for negative reviews or rating drops
- [ ] Prepare v1.0.1 with any urgent fixes
- [ ] Celebrate with team! 🎉

