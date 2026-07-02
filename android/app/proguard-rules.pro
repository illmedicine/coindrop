-keep class in.coindrop.** { *; }
-keepclassmembers class in.coindrop.** { *; }

# WebView JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep WebView classes
-keep class android.webkit.** { *; }

# Splash screen
-keep class androidx.core.splashscreen.** { *; }
