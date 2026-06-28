# CoinDrop Android App - Quick Start Guide

## What's Been Set Up

✅ **Mobile web version**: Fixed responsive design for mobile devices  
✅ **Capacitor project**: Android wrapper for web app  
✅ **Build configuration**: Android 15 (API 35) targeting  
✅ **Signing setup**: Ready for release builds  
✅ **Documentation**: Complete Google Play Store submission guide  
✅ **Design specs**: App icon and asset guidelines  

## Your App Info
- **App Name**: CoinDrop
- **Package ID**: com.coindrop.app
- **Version**: 1.0.0
- **Target API**: Android 15 (API 35)
- **Min API**: Android 8.0 (API 26)

---

## Build Your AAB in 5 Steps

### 1. Install Dependencies (5 min)
```bash
cd C:\Users\demar\Documents\GitHub\coindrop
npm install
```

### 2. Create Signing Key (2 min, one-time)
```bash
keytool -genkey -v \
  -keystore release.keystore \
  -alias coindrop_key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "CN=CoinDrop,O=Illy Robotic Instruments,L=Buffalo,ST=NY,C=US" \
  -storepass YourStrongPassword123! \
  -keypass YourStrongPassword123!

# 🔐 BACKUP THIS FILE: release.keystore
# Losing it = cannot update app forever!
```

### 3. Set Up Signing Config (1 min)
Create `android/signing.properties`:
```
storeFile=../release.keystore
storePassword=YourStrongPassword123!
keyAlias=coindrop_key
keyPassword=YourStrongPassword123!
```

### 4. Add Android & Build (10 min)
```bash
# Add Android platform
npx capacitor add android

# Sync web assets
npx capacitor sync android

# Build release AAB
cd android
./gradlew bundleRelease

# Output: app/build/outputs/bundle/release/app-release.aab (~10MB)
```

### 5. Test & Submit (varies)
```bash
# Test on device:
adb install app/build/outputs/apk/release/app-release.apk

# When ready, upload to Google Play Console:
# - Go to https://play.google.com/console
# - Create app "CoinDrop"
# - Upload .aab file
# - Fill in store listing (see BUILD-AAB-GUIDE.md)
# - Submit for review
```

---

## What You Need Before Building

- ✅ **Java 17+**: `java -version`
- ✅ **Android SDK 35**: Installed via Android Studio
- ✅ **Node.js 18+**: `node --version`
- ✅ **4GB free disk space**
- ✅ **Google Play account** ($25 one-time)

**Don't have Android SDK?**
1. Download Android Studio: https://developer.android.com/studio
2. Run installer
3. Select "Android SDK" during setup
4. Choose API 35 when prompted

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `capacitor.config.json` | Capacitor app config |
| `package.json` | npm dependencies |
| `android-build-config.gradle` | Gradle signing & build settings |
| `BUILD-AAB-GUIDE.md` | 📖 Complete step-by-step (25 pages) |
| `GOOGLE-PLAYSTORE-REQUIREMENTS.md` | 📋 Asset specs & compliance checklist |
| `ICON-DESIGN-SPEC.md` | 🎨 Icon design guide with free tools |

---

## Mobile Web Fixes (Already Applied)

✅ Dashboard responsive design fixed for mobile  
✅ Full-width layout on mobile viewport  
✅ Touch-friendly buttons and controls  
✅ All features work in mobile mode  
✅ No horizontal scrolling  

---

## Generate App Assets

### App Icon (512×512px)
**Free tools**:
- Canva: https://www.canva.com/create/app-icon/ (15 min)
- Figma: https://www.figma.com (20 min)
- Adobe Express: https://www.adobe.com/express/create/icon (15 min)

See `ICON-DESIGN-SPEC.md` for design specs.

### Screenshots & Feature Graphics
**Use Canva**:
1. Create 1024×500px design (feature graphic)
2. Add app icon and feature text
3. Take screenshots from running app
4. Export all as PNG

**Or hire a designer**:
- Fiverr: $50-150 (2-3 days)
- Upwork: $30-100/hr (1-2 days)

---

## Submit to Google Play Store

1. **Create account**: https://play.google.com/console ($25)
2. **Create app**: Name "CoinDrop", Category "Finance"
3. **Upload AAB**: Drag & drop your .aab file
4. **Fill store listing**:
   - Icon (512×512 PNG)
   - Feature graphic (1024×500 PNG)
   - Screenshots (1080×1920 PNG, min 2)
   - Title, description, release notes
   - Privacy policy URL
   - Content rating questionnaire
5. **Review & submit**: Click "Start rollout to production"
6. **Staged rollout**: Release to 5% first, monitor for 24h, then 100%

**See `BUILD-AAB-GUIDE.md` Step 8 for detailed screenshots of each step.**

---

## Monitor Your App

Once live, check daily:
1. **Google Play Console** → Stats → Overview
2. Monitor installs, uninstalls, crash rate
3. Respond to reviews within 48 hours
4. Alert if crash rate > 1%

---

## Next Version Updates

When you add features and want to release v1.0.1:

```bash
# Update version
# Edit android/app/build.gradle.kts:
#   versionCode: 1 → 2
#   versionName: "1.0.0" → "1.0.1"

cd android
./gradlew bundleRelease

# Upload new .aab to Play Console
# Same process as initial release
```

---

## Common Issues & Fixes

**"SDK not found"**
```bash
export ANDROID_SDK_ROOT=$HOME/Library/Android/sdk
# Then retry build
```

**"Java version mismatch"**
```bash
java -version  # Check it's Java 17+
export JAVA_HOME=/path/to/java17
./gradlew bundleRelease
```

**"Build takes forever"**
- First build: 5-10 min (normal)
- Subsequent: 1-3 min
- Increase RAM: `org.gradle.jvmargs=-Xmx2048m`

**More help**: See `BUILD-AAB-GUIDE.md` Troubleshooting section

---

## Timeline

| Step | Time | One-Time? |
|------|------|-----------|
| Install dependencies | 2 min | ✅ Yes |
| Create signing key | 2 min | ✅ Yes |
| Build AAB (first) | 10 min | ❌ No |
| Build AAB (future) | 3 min | ❌ No |
| Google Play setup | 15 min | ✅ Yes |
| Create assets | 1-2 hours | ✅ Yes |
| Submit to Play Store | 30 min | ✅ Yes |
| Play Store review | 2-4 hours | ✅ Yes (varies) |

**Total time to first release**: ~4-6 hours (mostly waiting for assets & Play Store review)

---

## Success Checklist

- [ ] Dependencies installed
- [ ] Signing key created & backed up offline
- [ ] AAB builds without errors
- [ ] AAB tested on device (no crashes)
- [ ] App icon created (512×512 PNG)
- [ ] Feature graphic created (1024×500 PNG)
- [ ] Screenshots captured (1080×1920 PNG, ≥2)
- [ ] Google Play account created ($25 paid)
- [ ] App listing filled completely
- [ ] Privacy policy URL live
- [ ] Content rating completed
- [ ] AAB uploaded to Play Console
- [ ] Staged rollout started (5%)
- [ ] No crashes in 24 hours
- [ ] Rollout increased to 100%
- [ ] App live on Play Store! 🎉

---

## Support

For detailed instructions, see:
- **BUILD-AAB-GUIDE.md** — Complete step-by-step build & submission
- **GOOGLE-PLAYSTORE-REQUIREMENTS.md** — Play Store specs & compliance
- **ICON-DESIGN-SPEC.md** — Icon design guide

Need help? Check Discord: https://discord.gg/847XjyVa3C

---

## Keep Your Keystore Safe!

⚠️ **WARNING**: Your signing keystore (`release.keystore`) is critical.

- **Store it offline**: USB drive or encrypted cloud (Dropbox, iCloud)
- **Back it up**: Multiple copies
- **Don't lose it**: If lost, you cannot update this app ever
- **Keep password secure**: Min 16 chars, very strong
- **Never commit to git**: Already in .gitignore

This is the most important file for your app's lifetime. Treat it like your app's password.

