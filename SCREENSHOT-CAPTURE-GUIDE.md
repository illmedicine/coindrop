# CoinDrop Screenshot Capture Guide

All app icon assets have been automatically generated from your logo!

Now you need to **replace the screenshot templates with REAL screenshots** of your running app.

## What Was Generated

✓ **6 App Icons** (automatically sized from your logo):
- icon_512.png (Google Play listing)
- icon_192.png (Launcher)
- icon_144.png (Large screen)
- icon_96.png (Medium)
- icon_72.png (Small)
- icon_48.png (Notification)

✓ **Feature Graphic** (manually created):
- feature_graphic_1024x500.png

✗ **Screenshots** (NEED TO BE REPLACED):
- screenshot_template_1080x1920.png (Phone)
- screenshot_tablet_2560x1440.png (Tablet)

---

## Step 1: Capture Real App Screenshots

### Option A: Use Android Device (Easiest)

1. **Deploy app to device**:
   ```bash
   npx capacitor run android
   ```

2. **Take screenshots** (on physical device):
   - Press: Power + Volume Down (most devices)
   - Screenshot saves to device
   - Connect to computer and copy files

3. **Screenshot key screens**:
   1. Login/Register screen
   2. Dashboard overview
   3. Available tasks
   4. Leaderboard
   5. User profile/earnings

### Option B: Use Android Emulator

1. **Start emulator**:
   ```bash
   Android Studio → Virtual Device Manager → Run Device
   ```

2. **Deploy app**:
   ```bash
   npx capacitor run android
   ```

3. **Take screenshots in emulator**:
   - Tools → Screenshot (in emulator)
   - Screenshot saves to disk

4. **Emulator screenshot folder**:
   ```
   C:\Users\[YourUser]\AppData\Local\Temp\[screenshot_name].png
   ```

### Option C: Web Browser Screenshots (Quick/Mock)

If you don't have Android yet:

1. **Open browser dev tools**: F12
2. **Open mobile view**: Ctrl+Shift+M
3. **Set size**: 1080x1920 (or custom)
4. **Take screenshot**: Tools → Take Screenshot
5. **Screenshot saved to Downloads**

---

## Step 2: Resize Screenshots to Required Dimensions

**Phone screenshots**: Must be exactly **1080×1920 px** (aspect ratio 9:16)
**Tablet screenshots**: Must be exactly **2560×1440 px** (aspect ratio 16:9)

### Use Paint (Windows - Free)

1. **Open Paint.exe** (included with Windows)
2. **File → Open** → Select screenshot
3. **Image → Resize and Skew**
   - Horizontal: 1080 px
   - Vertical: 1920 px
   - Uncheck "Maintain aspect ratio"
4. **File → Save As**
   - Format: PNG
   - Name: `screenshot_1_phone.png`

### Use ImageResizer (Online - Free)

1. Go to: https://imageresizer.com/
2. Upload your screenshot
3. Set size: 1080×1920
4. Download resized PNG

### Use Python (Batch Processing)

```bash
python resize_screenshots.py
```

Create file: `resize_screenshots.py`

```python
from PIL import Image
import os

# Resize phone screenshot
img = Image.open("screenshot_raw.png")
img = img.resize((1080, 1920), Image.Resampling.LANCZOS)
img.save("assets/playstore/screenshot_1.png")

# Resize tablet screenshot  
img = Image.open("screenshot_tablet_raw.png")
img = img.resize((2560, 1440), Image.Resampling.LANCZOS)
img.save("assets/playstore/screenshot_tablet_1.png")
```

---

## Step 3: Replace Template Files

### For Phone Screenshots (1080×1920)

You need **at least 2**, recommended **3-5**:

1. **Login/Registration Screen**
   - Save as: `assets/playstore/screenshot_1_login.png`
   - Dimensions: 1080×1920

2. **Dashboard Overview**
   - Save as: `assets/playstore/screenshot_2_dashboard.png`
   - Dimensions: 1080×1920

3. **Available Tasks** (Optional)
   - Save as: `assets/playstore/screenshot_3_tasks.png`
   - Dimensions: 1080×1920

4. **Leaderboard** (Optional)
   - Save as: `assets/playstore/screenshot_4_leaderboard.png`
   - Dimensions: 1080×1920

5. **User Profile** (Optional)
   - Save as: `assets/playstore/screenshot_5_profile.png`
   - Dimensions: 1080×1920

**Then replace the template**:
- Delete: `assets/playstore/screenshot_template_1080x1920.png`
- Or overwrite it with one of your real screenshots

### For Tablet Screenshots (2560×1440)

You need **at least 1**:

1. **Dashboard (Tablet View)**
   - Save as: `assets/playstore/screenshot_tablet_1.png`
   - Dimensions: 2560×1440

---

## Step 4: Edit Feature Graphic (Optional but Recommended)

The feature_graphic_1024x500.png was auto-generated but can be improved:

### Using Paint

1. **Open**: `assets/playstore/feature_graphic_1024x500.png`
2. **Add your logo** (Ctrl+V to paste)
3. **Add branding** text or colors
4. **Keep it clean** and readable
5. **Save as PNG**

### Using Canva

1. Go to: https://www.canva.com
2. Create 1024×500px design
3. Add CoinDrop logo and branding
4. Export as PNG
5. Save to: `assets/playstore/feature_graphic_1024x500.png`

---

## Step 5: Verify All Assets

After capturing and resizing screenshots:

```bash
# Check all files exist
ls -lh assets/playstore/

# Verify sizes (for reference)
# - icon_512.png: ~200KB
# - icon_192.png: ~40KB
# - icon_48.png: ~4KB
# - screenshot_1080x1920.png: ~40KB
# - screenshot_2560x1440.png: ~40KB
# - feature_graphic.png: ~15KB
```

---

## Step 6: Google Play Store Upload

1. **Go to**: https://play.google.com/console
2. **Select app**: CoinDrop
3. **Store Listing** tab → Scroll to "Graphics"

4. **Upload icons**:
   - App icon: `icon_512.png`

5. **Upload graphics**:
   - Feature graphic: `feature_graphic_1024x500.png`

6. **Upload screenshots**:
   - Phone screenshots: Upload 2-5 screenshots
   - Tablet screenshots: Upload 1+ screenshot
   - Accept landscape/portrait as needed

7. **Save and continue**

---

## Tips for Great Screenshots

✓ **What Google wants to see**:
- Real app screenshots (not artwork)
- Show core features and functionality
- Readable text (18pt+ font)
- Consistent branding colors
- No fake user data

✗ **What to avoid**:
- Generic placeholder images
- Blurred faces or personal info
- Outdated UI or version numbers
- Text that's too small
- Screenshots with glitches or errors

✓ **Best practices**:
1. Test each screen thoroughly before screenshotting
2. Remove any test/debug data
3. Show real features users care about
4. Include a mix of happy path screens
5. Add text overlays explaining key features (optional)

---

## Automation: Bulk Screenshot Processing

If you have multiple screenshots to resize:

### Python Script to Batch Resize

Create `batch_resize_screenshots.py`:

```python
from PIL import Image
import os

PLAYSTORE_DIR = "assets/playstore"
SCREENSHOTS_DIR = "screenshots_raw"

# Phone screenshots (1080x1920)
for i in range(1, 6):
    input_file = os.path.join(SCREENSHOTS_DIR, f"phone_{i}.png")
    if os.path.exists(input_file):
        img = Image.open(input_file)
        img = img.resize((1080, 1920), Image.Resampling.LANCZOS)
        output_file = os.path.join(PLAYSTORE_DIR, f"screenshot_{i}.png")
        img.save(output_file, "PNG", optimize=True)
        print(f"Resized: {input_file} -> {output_file}")

# Tablet screenshot (2560x1440)
input_file = os.path.join(SCREENSHOTS_DIR, "tablet_1.png")
if os.path.exists(input_file):
    img = Image.open(input_file)
    img = img.resize((2560, 1440), Image.Resampling.LANCZOS)
    output_file = os.path.join(PLAYSTORE_DIR, "screenshot_tablet_1.png")
    img.save(output_file, "PNG", optimize=True)
    print(f"Resized: {input_file} -> {output_file}")

print("All screenshots resized successfully!")
```

Then run:
```bash
python batch_resize_screenshots.py
```

---

## Checklist Before Upload to Play Store

- [ ] App icons: 6 files in assets/playstore/ (icon_48 to icon_512)
- [ ] Feature graphic: 1024×500 PNG with your branding
- [ ] Phone screenshots: At least 2 at exactly 1080×1920
- [ ] Tablet screenshot: At least 1 at exactly 2560×1440
- [ ] All screenshots are real app screens (not templates)
- [ ] No blurry or broken screenshots
- [ ] File sizes reasonable (< 100KB each for screenshots)
- [ ] Ready to upload to Google Play Console

---

## Common Issues & Fixes

**Screenshot too large/small**:
- Resize to exact dimensions: 1080×1920 (phone) or 2560×1440 (tablet)
- Use Paint or online resizer

**Screenshot looks blurry**:
- Take at native device resolution
- Use LANCZOS filter when resizing (not NEAREST)

**Wrong aspect ratio**:
- Phone must be 9:16 (1080×1920)
- Tablet must be 16:9 (2560×1440)

**Feature graphic colors wrong**:
- Re-edit in Canva or Paint
- Ensure navy + orange branding colors match

---

## Next Actions

1. ✓ Icons generated (already done)
2. ⬜ Capture real app screenshots on device/emulator
3. ⬜ Resize to required dimensions
4. ⬜ Replace template files in assets/playstore/
5. ⬜ Edit feature graphic with your logo
6. ⬜ Upload all files to Google Play Console
7. ⬜ Submit for review

**Estimated time**: 1-2 hours (mostly manual screenshotting)

