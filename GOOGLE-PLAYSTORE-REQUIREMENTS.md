# Google Play Store Requirements for CoinDrop AAB

## Target API Level & Versioning
- **compileSdkVersion**: 35 (Android 15)
- **targetSdkVersion**: 35
- **minSdkVersion**: 26 (Android 8.0+)
- **AAB Format**: Required (Android App Bundle)
- **App Version**: 1.0.0 (build 1)

## Required Graphics Assets

### App Icons
| Format | Size | Name | Purpose |
|--------|------|------|---------|
| PNG | 512×512 px | icon_512.png | High-res launcher icon (Google Play) |
| PNG | 192×192 px | icon_192.png | Launcher icon |
| PNG | 144×144 px | icon_144.png | Large screen icon |
| PNG | 96×96 px | icon_96.png | Medium icon |
| PNG | 72×72 px | icon_72.png | Small icon |
| PNG | 48×48 px | icon_48.png | Notification icon |

**Requirements**:
- No rounded corners (system applies automatically)
- Safe area: inner 66dp square
- Should have solid background (no transparency)
- Color: CoinDrop orange shield badge

### Feature Graphic
| Format | Size | Name | Purpose |
|--------|------|------|---------|
| PNG | 1024×500 px | feature_graphic.png | Store listing banner |

**Requirements**:
- Aspect ratio: 2:1 (exactly 1024×500)
- Safe area: content within center 924×400
- Should showcase app's main feature
- Display "CoinDrop" branding + orange gradient

### Screenshots - Phone
| Format | Size | Name | Min Required |
|--------|------|------|----------|
| PNG | 1080×1920 px | screenshot_1.png | At least 2 |
| PNG | 1080×1920 px | screenshot_2.png | |
| PNG | 1080×1920 px | screenshot_3.png | Optional |
| PNG | 1080×1920 px | screenshot_4.png | Optional |
| PNG | 1080×1920 px | screenshot_5.png | Optional |

**Requirements**:
- Aspect ratio: 9:16 (portrait)
- Real screenshots from running app (not artwork)
- Show core features: login, dashboard, leaderboard, earning potential
- Can include text overlay (max 18pt font)
- No blurred faces of real people

### Screenshots - Tablet
| Format | Size | Name | Min Required |
|--------|------|------|----------|
| PNG | 2560×1440 px | screenshot_tablet_1.png | At least 1 |
| PNG | 2560×1440 px | screenshot_tablet_2.png | Optional |

**Requirements**:
- Aspect ratio: 16:9 (landscape)
- Show dashboard with full tablet layout
- Demonstrate responsive design

### Preview Video (Optional but Recommended)
| Format | Resolution | Duration | Name |
|--------|-----------|----------|------|
| MP4 | 1280×720px | 15-30 sec | preview_video.mp4 |

### Promo Graphics
| Format | Size | Purpose |
|--------|------|---------|
| PNG | 1200×628 px | Facebook/Social sharing |
| PNG | 1200×900 px | Promotional poster |

## Content Rating Questionnaire Answers
- **Mature Audiences**: No
- **Violence**: None
- **Sexual Content**: None
- **Profanity**: None
- **Alcohol/Tobacco/Drugs**: None
- **Gambling**: No (cryptocurrency is not gambling under Google's criteria)
- **Mistreatment**: None
- **Personal Sensitive Info**: Email, wallet address (disclosed in privacy policy)

## Privacy & Legal Requirements

### Privacy Policy
- Must include:
  - Data collection: Email, Discord ID, display name, avatar, wallet address
  - Firebase usage
  - Analytics (Google Analytics ID: G-WT35ZRWJG0)
  - No third-party ad networks
  - Cryptocurrency transaction tracking
  - Data retention: Indefinite unless user deletes account
  - User rights: View, export, delete data
  - Contact: support@illyrobotic-ai.com

### Terms of Service
- Include clauses for:
  - User eligibility (18+ recommended for crypto)
  - Task completion requirements
  - Payout T&Cs
  - Solana wallet risk disclosure
  - Account termination rights
  - Dispute resolution

### Permissions Requested
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

## APK/AAB Signing Requirements

### Keystore Setup (One-time, keep secure)
```bash
keytool -genkey -v -keystore release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias coindrop_key \
  -storepass ${KEYSTORE_PASSWORD} \
  -keypass ${KEY_PASSWORD}
```

**Security**:
- Store keystore file in secure location (not in repo)
- Use strong password (min 16 chars)
- Keep backup copy offline
- Same keystore required for all future updates
- Losing keystore = cannot update app (permanent)

## Build Process for AAB

### Prerequisites
1. Android SDK 35 installed
2. Gradle 8.6+
3. Java 17+
4. Signed keystore file

### Build Steps
```bash
# 1. Install dependencies
npm install

# 2. Add Android platform
npx capacitor add android

# 3. Sync web assets
npx capacitor sync android

# 4. Open in Android Studio (recommended for first build)
npx capacitor open android

# 5. Build release AAB (from android folder)
cd android
./gradlew bundleRelease

# AAB output: android/app/build/outputs/bundle/release/app-release.aab
```

### Alternative: Command-line Build
```bash
cd android
./gradlew bundleRelease \
  -Dorg.gradle.java.home=/path/to/java17 \
  -Pcom.android.tools.lint.force_minsdk_check=true
```

## Google Play Store Submission Checklist

### Before Upload
- [ ] AAB file generated and tested on physical devices
- [ ] App version code incremented
- [ ] All screenshots and graphics prepared
- [ ] Feature graphic approved by team
- [ ] Privacy policy finalized and linked
- [ ] Terms of Service finalized
- [ ] Content rating submitted
- [ ] Contact email verified: support@illyrobotic-ai.com
- [ ] Wallet risk disclaimers added

### App Listing Details
- **Title**: CoinDrop (max 50 chars)
- **Short Description**: "Turn your screen time into Solana" (max 80 chars)
- **Full Description** (4000 chars max):
  - Core value proposition
  - Feature list (watch, like, comment, subscribe)
  - Payout info
  - Wallet requirements
  - Geographic availability
  - Support contact

- **Release Notes** (500 chars max):
  ```
  CoinDrop v1.0.0 - Initial Release
  - Watch YouTube, earn Solana
  - Phantom wallet integration
  - Real-time leaderboard
  - Daily payouts
  - 190+ countries supported
  ```

### Category & Content Rating
- **Category**: Lifestyle → Finance
- **Content Rating**: 3+ (Low content risk)
- **Audience**: 13+

## Test Devices (Internal Testing)
1. Pixel 6 or later (recommended)
2. Samsung Galaxy A series
3. One device with Android 8.0 (API 26)
4. One device with Android 15 (API 35)

### Test Checklist
- [ ] Login flow works (Discord)
- [ ] Mobile responsive (480px, 768px, 1024px)
- [ ] Task screenshots accepted
- [ ] Wallet connection succeeds
- [ ] Payout flow works (testnet)
- [ ] No crashes or ANRs in 5 min use
- [ ] Offline handling graceful
- [ ] Images load properly
- [ ] Performance acceptable (<2s load)

## Post-Launch Monitoring
- Monitor crash reports daily (Google Play Console)
- ANR rate < 0.1%
- Uninstall rate < 5%
- Respond to reviews within 48 hours
- Push updates monthly (bug fixes + features)

## Compliance & Regulatory
- GDPR: Privacy policy includes data export
- CCPA: California privacy rights disclosed
- Crypto: Solana is not a security/gambling product
- Financial: Not a banking service (disclosure required)
- Age: Recommend 18+ for crypto transactions

## Helpful Resources
- Google Play Store Console: https://play.google.com/console
- Capacitor Docs: https://capacitorjs.com
- Android Guidelines: https://developer.android.com/distribute/best-practices
- Asset Studio: https://romannurik.github.io/AndroidAssetStudio/
