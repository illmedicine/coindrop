# -*- coding: utf-8 -*-
"""
CoinDrop Google Play Store Asset Generator

Creates all required assets for Google Play Store submission:
- App icons (512x512, 192x192, 144x144, 96x96, 72x72, 48x48)
- Feature graphic (1024x500)
- Screenshot templates
- Optimized PNG images

Usage:
    python create_playstore_assets.py
"""

import os
import sys
from PIL import Image, ImageDraw, ImageFont
import json
from datetime import datetime

# Configuration
ASSETS_DIR = "assets"
PLAYSTORE_DIR = os.path.join(ASSETS_DIR, "playstore")
LOGO_PATH = os.path.join(ASSETS_DIR, "logo.png")

# Color palette (matching CoinDrop brand)
COLORS = {
    "navy": "#1B2A4A",
    "navy_dark": "#0F1A2E",
    "orange": "#F7931A",
    "orange_light": "#FFB347",
    "white": "#FFFFFF",
    "gold": "#FFD700",
}

# Icon sizes needed for Google Play Store
ICON_SIZES = {
    "icon_512": (512, 512),
    "icon_192": (192, 192),
    "icon_144": (144, 144),
    "icon_96": (96, 96),
    "icon_72": (72, 72),
    "icon_48": (48, 48),
}

def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple."""
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def create_directory_structure():
    """Create necessary directories."""
    os.makedirs(PLAYSTORE_DIR, exist_ok=True)
    print("[OK] Created directory: %s" % PLAYSTORE_DIR)

def process_logo():
    """Load and validate logo image."""
    if not os.path.exists(LOGO_PATH):
        print("[ERROR] Logo not found at %s" % LOGO_PATH)
        return None

    try:
        img = Image.open(LOGO_PATH).convert("RGBA")
        print("[OK] Loaded logo: %s pixels" % str(img.size))
        return img
    except Exception as e:
        print("[ERROR] Error loading logo: %s" % str(e))
        return None

def create_app_icons(logo_img):
    """Create app icons at all required sizes."""
    if logo_img is None:
        print("[ERROR] Cannot create icons without logo")
        return False

    print("\n[INFO] Creating app icons...")

    for name, size in ICON_SIZES.items():
        icon = logo_img.resize(size, Image.Resampling.LANCZOS)
        output_path = os.path.join(PLAYSTORE_DIR, "%s.png" % name)
        icon.save(output_path, "PNG", optimize=True)
        print("  [OK] Created %s.png (%sx%s)" % (name, size[0], size[1]))

    return True

def create_feature_graphic():
    """Create feature graphic banner (1024x500)."""
    print("\n[INFO] Creating feature graphic (1024x500)...")

    width, height = 1024, 500

    navy_rgb = hex_to_rgb(COLORS["navy"])
    navy_dark_rgb = hex_to_rgb(COLORS["navy_dark"])

    img = Image.new("RGB", (width, height), navy_rgb)
    draw = ImageDraw.Draw(img)

    for y in range(height):
        ratio = y / height
        r = int(navy_rgb[0] + (navy_dark_rgb[0] - navy_rgb[0]) * ratio)
        g = int(navy_rgb[1] + (navy_dark_rgb[1] - navy_rgb[1]) * ratio)
        b = int(navy_rgb[2] + (navy_dark_rgb[2] - navy_rgb[2]) * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    orange_rgb = hex_to_rgb(COLORS["orange"])
    draw.rectangle([(0, 0), (width, 8)], fill=orange_rgb)

    try:
        if sys.platform == "win32":
            font_large = ImageFont.truetype("arial.ttf", 60)
            font_small = ImageFont.truetype("arial.ttf", 24)
        else:
            font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 60)
            font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
    except:
        font_large = font_small = ImageFont.load_default()

    white_rgb = hex_to_rgb(COLORS["white"])

    title = "COINDROP"
    bbox = draw.textbbox((0, 0), title, font=font_large)
    title_width = bbox[2] - bbox[0]
    title_x = (width - title_width) // 2
    draw.text((title_x, 120), title, fill=white_rgb, font=font_large)

    subtitle = "Turn Your Screen Time Into Solana"
    bbox = draw.textbbox((0, 0), subtitle, font=font_small)
    subtitle_width = bbox[2] - bbox[0]
    subtitle_x = (width - subtitle_width) // 2
    draw.text((subtitle_x, 220), subtitle, fill=white_rgb, font=font_small)

    features = "Watch * Like * Comment * Earn"
    bbox = draw.textbbox((0, 0), features, font=font_small)
    features_width = bbox[2] - bbox[0]
    features_x = (width - features_width) // 2
    draw.text((features_x, 300), features, fill=orange_rgb, font=font_small)

    output_path = os.path.join(PLAYSTORE_DIR, "feature_graphic_1024x500.png")
    img.save(output_path, "PNG", optimize=True)
    print("  [OK] Created feature_graphic_1024x500.png")

    return True

def create_screenshot_template():
    """Create screenshot template with UI elements."""
    print("\n[INFO] Creating screenshot template...")

    width, height = 1080, 1920

    bg_color = hex_to_rgb(COLORS["navy"])
    img = Image.new("RGB", (width, height), bg_color)
    draw = ImageDraw.Draw(img)

    orange_rgb = hex_to_rgb(COLORS["orange"])
    draw.rectangle([(0, 0), (width, 100)], fill=orange_rgb)

    try:
        if sys.platform == "win32":
            font_title = ImageFont.truetype("arial.ttf", 40)
            font_body = ImageFont.truetype("arial.ttf", 24)
        else:
            font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 40)
            font_body = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
    except:
        font_title = font_body = ImageFont.load_default()

    white_rgb = hex_to_rgb(COLORS["white"])

    draw.text((50, 30), "CoinDrop", fill=white_rgb, font=font_title)

    navy_light = hex_to_rgb("#243656")

    card_y = 150
    card_height = 200
    card_margin = 20

    for i in range(4):
        y_pos = card_y + (i * (card_height + 20))
        if y_pos + card_height > height - 50:
            break

        draw.rectangle(
            [(card_margin, y_pos), (width - card_margin, y_pos + card_height)],
            fill=navy_light,
            outline=orange_rgb,
            width=3
        )

        task_names = ["Watch YouTube", "Like Instagram", "Subscribe Channel", "Earn SOL"]
        rewards = ["$0.01", "$0.005", "$0.05", "+$0.01/mo"]

        if i < len(task_names):
            draw.text((card_margin + 20, y_pos + 30), task_names[i], fill=white_rgb, font=font_body)
            draw.text((card_margin + 20, y_pos + 80), "Reward: %s" % rewards[i], fill=orange_rgb, font=font_body)

    draw.text((50, height - 100), "Available Worldwide * Get Paid Daily", fill=white_rgb, font=font_body)

    output_path = os.path.join(PLAYSTORE_DIR, "screenshot_template_1080x1920.png")
    img.save(output_path, "PNG", optimize=True)
    print("  [OK] Created screenshot_template_1080x1920.png")

    return True

def create_tablet_screenshot():
    """Create tablet screenshot template (landscape)."""
    print("\n[INFO] Creating tablet screenshot template...")

    width, height = 2560, 1440

    bg_color = hex_to_rgb(COLORS["navy"])
    img = Image.new("RGB", (width, height), bg_color)
    draw = ImageDraw.Draw(img)

    orange_rgb = hex_to_rgb(COLORS["orange"])
    draw.rectangle([(0, 0), (width, 10)], fill=orange_rgb)

    try:
        if sys.platform == "win32":
            font_title = ImageFont.truetype("arial.ttf", 48)
            font_body = ImageFont.truetype("arial.ttf", 32)
        else:
            font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 48)
            font_body = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 32)
    except:
        font_title = font_body = ImageFont.load_default()

    white_rgb = hex_to_rgb(COLORS["white"])

    draw.text((100, 50), "CoinDrop - Responsive Dashboard", fill=white_rgb, font=font_title)

    card_width = 380
    card_height = 300
    margin = 40

    for row in range(2):
        for col in range(3):
            x = margin + col * (card_width + margin)
            y = 200 + row * (card_height + margin)

            if x + card_width < width - margin:
                navy_light = hex_to_rgb("#243656")
                draw.rectangle(
                    [(x, y), (x + card_width, y + card_height)],
                    fill=navy_light,
                    outline=orange_rgb,
                    width=2
                )
                draw.text((x + 20, y + 20), "Task %d" % (row * 3 + col + 1), fill=white_rgb, font=font_body)

    draw.text((100, height - 100), "Works on all screen sizes * Fully responsive design", fill=white_rgb, font=font_body)

    output_path = os.path.join(PLAYSTORE_DIR, "screenshot_tablet_2560x1440.png")
    img.save(output_path, "PNG", optimize=True)
    print("  [OK] Created screenshot_tablet_2560x1440.png")

    return True

def generate_asset_index():
    """Create JSON index of all generated assets."""
    print("\n[INFO] Creating asset index...")

    assets_info = {
        "generated_at": datetime.now().isoformat(),
        "app_name": "CoinDrop",
        "version": "1.0.0",
        "total_assets": 10,
        "files": [
            {"name": "icon_512.png", "size": "512x512", "purpose": "Google Play listing icon"},
            {"name": "icon_192.png", "size": "192x192", "purpose": "Launcher icon"},
            {"name": "icon_144.png", "size": "144x144", "purpose": "Large screen icon"},
            {"name": "icon_96.png", "size": "96x96", "purpose": "Medium icon"},
            {"name": "icon_72.png", "size": "72x72", "purpose": "Small icon"},
            {"name": "icon_48.png", "size": "48x48", "purpose": "Notification icon"},
            {"name": "feature_graphic_1024x500.png", "size": "1024x500", "purpose": "Play Store banner"},
            {"name": "screenshot_template_1080x1920.png", "size": "1080x1920", "purpose": "Phone screenshot"},
            {"name": "screenshot_tablet_2560x1440.png", "size": "2560x1440", "purpose": "Tablet screenshot"},
        ]
    }

    index_path = os.path.join(PLAYSTORE_DIR, "ASSETS_INDEX.json")
    with open(index_path, "w") as f:
        json.dump(assets_info, f, indent=2)

    print("  [OK] Created ASSETS_INDEX.json")
    return True

def print_summary():
    """Print summary of generated assets."""
    print("\n" + "="*60)
    print("[SUCCESS] GOOGLE PLAY STORE ASSETS GENERATED!")
    print("="*60)

    print("\n[INFO] All assets saved to: %s" % PLAYSTORE_DIR)

    print("\n[INFO] Generated Assets:")
    print("\n  App Icons:")
    for name, size in ICON_SIZES.items():
        print("    - %s.png (%sx%s)" % (name, size[0], size[1]))

    print("\n  Graphics:")
    print("    - feature_graphic_1024x500.png (Play Store banner)")

    print("\n  Screenshots:")
    print("    - screenshot_template_1080x1920.png (Phone - portrait)")
    print("    - screenshot_tablet_2560x1440.png (Tablet - landscape)")

    print("\n  Index:")
    print("    - ASSETS_INDEX.json (asset inventory)")

    print("\n[IMPORTANT] NEXT STEPS:")
    print("\n  1. Replace screenshot templates with REAL app screenshots")
    print("  2. Edit feature graphic with your branding")
    print("  3. Upload all files to Google Play Console")
    print("  4. Fill in store listing details")
    print("  5. Submit for review")

    print("\n[INFO] File Directory:")
    print("    %s/" % PLAYSTORE_DIR)

    total_size = 0
    if os.path.exists(PLAYSTORE_DIR):
        for filename in os.listdir(PLAYSTORE_DIR):
            if filename.endswith(".png"):
                filepath = os.path.join(PLAYSTORE_DIR, filename)
                size = os.path.getsize(filepath) / 1024
                total_size += size
                print("    - %s (%.1f KB)" % (filename, size))

    print("\n    Total size: %.1f KB" % total_size)

    print("\n" + "="*60)

def main():
    """Main function to generate all assets."""
    print("[START] CoinDrop Google Play Store Asset Generator")
    print("="*60)

    create_directory_structure()
    logo = process_logo()

    try:
        success = True
        success = success and create_app_icons(logo)
        success = success and create_feature_graphic()
        success = success and create_screenshot_template()
        success = success and create_tablet_screenshot()
        success = success and generate_asset_index()

        if success:
            print_summary()
            return 0
        else:
            print("\n[ERROR] Some assets failed to generate")
            return 1
    except Exception as e:
        print("\n[ERROR] Exception: %s" % str(e))
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())
