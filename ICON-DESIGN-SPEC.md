# CoinDrop App Icon Design Specification

## App Icon (512×512px base)

### Design Brief
**Professional cryptocurrency fintech app icon** with shield badge and coin motif.

### Color Palette
- **Primary Orange**: #F7931A (Solana-inspired)
- **Orange Light**: #FFB347 (gradient highlight)
- **Navy Background**: #1B2A4A (dark professional)
- **Gold Accent**: #FFD700 (coin interior)
- **White**: #FFFFFF (highlights, coin symbol)

### Composition
1. **Background**: Solid navy blue (#1B2A4A), fills entire 512×512px
2. **Shield**: 
   - Orange gradient shield (linear, top-left to bottom-right)
   - Gradient from #F7931A to #FFB347
   - Rounded shield shape (pointed bottom)
   - Width: 380px, Height: 420px
   - Centered horizontally, positioned slightly high vertically
3. **Coin Inside Shield**:
   - Gold circle (#FFD700) inside shield, 240px diameter
   - White dollar sign ($) symbol
   - Font: Bold, geometric (similar to Futura or Space Grotesk)
   - Size: 140px tall
   - Centered both horizontally and vertically within shield
4. **Shadow/Depth**:
   - Subtle drop shadow on shield: 8px blur, 4px offset, 20% black
   - Inner highlight on shield top-left: white, 2px, 15% opacity

### Safe Zone
- Center 336×336px square must contain all critical details
- Ensures icon legibility at 48×48px size
- Shield should be fully visible; coin symbol must be clear

### Export Formats
1. **PNG** (primary):
   - 512×512px (Google Play listing)
   - 192×192px (launcher icon)
   - 144×144px (large screen)
   - 96×96px (medium icon)
   - 72×72px (small icon)
   - 48×48px (notification)
   - All with transparent background for Android

2. **WebP** (alternate):
   - Same sizes as PNG
   - Smaller file size

### Design Tools to Use
- **Figma** (free tier): Most flexible, professional
- **Adobe XD** (free): Good for icons
- **Canva** (free): Easiest, design templates
- **Photoshop** or **GIMP** (free - GIMP): Direct pixel control
- **Inkscape** (free, vector): Best for shield shape

### Step-by-Step Creation (Figma/Adobe XD)
1. Create 512×512px artboard
2. Add navy background rectangle
3. Draw shield shape using pen tool (pointed bottom, rounded top)
4. Apply orange gradient (#F7931A to #FFB347)
5. Add drop shadow (8px blur, 4px Y offset, 20% black)
6. Create white circle inside shield (240px)
7. Fill circle with gold (#FFD700)
8. Add white dollar sign text, bold font, 140px
9. Group shield + coin elements
10. Center group on artboard
11. Add subtle highlight on shield top-left
12. Export as PNG with transparency at all required sizes

### Reference Images
- **Phantom Wallet**: https://play.google.com/store/apps/details?id=app.phantom
- **Coinbase Wallet**: https://play.google.com/store/apps/details?id=org.toshi
- **Solflare**: https://play.google.com/store/apps/details?id=com.solflare.mobile

### File Naming Convention
```
icon_512.png          (Google Play listing, store)
icon_192.png          (launcher icon, large)
icon_144.png          (large screen)
icon_96.png           (medium icon)
icon_72.png           (small icon)
icon_48.png           (notification)
```

### Android Icon Guidelines
- No rounded corners needed (Android system adds them)
- Minimum 2px safe padding inside safe zone
- Avoid text in icon (OK here since "$" is symbolic)
- Consistent stroke width if using outlines (use filled shapes instead)
- Check rendering at all sizes before submission
- High contrast for visibility on all backgrounds

### Accessibility
- Icon should be recognizable at 48×48px
- High contrast between shield (orange) and background (navy)
- Dollar sign clear and legible
- No blinking or animations

---

## How to Generate These Icons Quickly

### Option 1: Canva (Easiest, ~15 min)
1. Go to https://www.canva.com/create/app-icon/
2. Start with "App Icon" template (512×512)
3. Add shapes: rounded rectangle (background), shield (search "shield")
4. Change colors: navy background, orange shield
5. Add text or emoji: dollar sign ($)
6. Download as PNG
7. Use online tool to resize to other dimensions

**Resize Tool**: https://imageresizer.com/ or https://www.birme.net/

### Option 2: Figma (Professional, ~20 min)
1. Create free Figma account
2. New file → 512×512px artboard
3. Rectangle tool: navy background
4. Search assets: "shield" or draw with pen tool
5. Apply gradients via fill panel
6. Add text layer with "$"
7. Right-click → Copy as PNG
8. Export at multiple sizes (File → Export)

### Option 3: Adobe Express (Free, ~15 min)
1. Go to https://www.adobe.com/express/create/icon
2. Start with icon template
3. Use built-in design elements
4. Customize colors
5. Download PNG

### Option 4: Hire a Designer
- **Fiverr**: $50-150 for custom icon (2-3 days)
- **99designs**: $299-999 for brand identity + icon (1-2 weeks)
- **Upwork**: $30-100/hr freelancer (1-2 days)

---

## Feature Graphic (1024×500px)

Use this for the Play Store listing banner.

### Design Brief
**Showcase CoinDrop app features** on dark background with orange accents.

### Composition
- **Left side (50%)**: CoinDrop app screenshot or mockup
- **Right side (50%)**: Feature text in white
- **Background**: Navy gradient (#1B2A4A to #0F1A2E)
- **Accent**: Orange banner or border (#F7931A)

### Text Content (Right Side)
```
COINDROP
Turn Your Screen Time Into Solana

Watch Videos
Like Posts
Subscribe to Channels
Get Paid Daily

Available Worldwide
```

### Design Tool: Canva
1. Create new design: 1024×500px
2. Upload app icon (512px) to left
3. Add text on right side
4. Navy gradient background
5. Orange accent stripe
6. Download as PNG

---

## Screenshots (1080×1920px each - Phone Portrait)

### Screenshot 1: Login Screen
- Show Discord login UI
- Text: "Sign In with Discord"
- Showcase simplicity

### Screenshot 2: Dashboard Overview
- Earnings banner with "$22.40 Daily Potential"
- Task list (Watch, Like, Comment, Subscribe)
- Leaderboard preview
- Text: "Watch. Engage. Earn."

### Screenshot 3: Active Tasks
- Creator cards with videos
- Task action buttons
- Cooldown timer visible
- Text: "250+ Videos from 17 Creators"

### Screenshot 4: Leaderboard
- Top earners list with badges
- Earnings amounts
- Text: "Compete globally, get paid daily"

### Screenshot 5: Wallet Integration
- Phantom wallet connected
- Total earned in SOL
- Recent payout history
- Text: "Instant payouts to your Phantom wallet"

### Quick Screenshot Tool
Use your phone/emulator and Android Studio:
1. Open app in Android emulator
2. Tools → Device File Explorer
3. Screenshot tool (Ctrl+S)
4. Save and crop to 1080×1920
5. Add white text overlay if needed

---

## Tablet Screenshots (2560×1440px Landscape)

Show the responsive dashboard layout on larger screen.

1. Full sidebar visible
2. Multiple task cards in grid
3. Leaderboard with more columns
4. Text: "Responsive design works everywhere"

---

## All Free Tools Summary

| Tool | Time | Quality | Difficulty |
|------|------|---------|-----------|
| Canva | 15 min | Good | Very Easy |
| Figma | 20 min | Excellent | Easy |
| Adobe Express | 15 min | Good | Easy |
| GIMP (desktop) | 30 min | Excellent | Medium |
| Inkscape (vector) | 30 min | Excellent | Hard |
| Fiverr (hire) | 2-3 days | Excellent | N/A |

---

## Next Steps
1. Choose a tool from above
2. Create the icon using the design spec
3. Export at all required sizes (512, 192, 144, 96, 72, 48px)
4. Screenshot the running app for feature graphics
5. Add text overlays or use Canva for feature graphic
6. Save all assets in `assets/playstore/` folder
7. Submit to Google Play Console

