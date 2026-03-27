import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static ThemeData get light {
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xFF5E45FF),
        brightness: Brightness.light,
        background: const Color(0xFFF1F4F9),
      ),
      textTheme: GoogleFonts.spaceGroteskTextTheme(),
    );

    return base.copyWith(
      scaffoldBackgroundColor: const Color(0xFFF1F4F9),
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.white.withOpacity(0.85),
        elevation: 0,
        scrolledUnderElevation: 0,
        foregroundColor: Colors.black87,
      ),
      cardTheme: CardThemeData(
        color: Colors.white.withOpacity(0.9),
        shadowColor: Colors.black12,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 18,
          vertical: 16,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: BorderSide(color: Colors.black.withOpacity(0.08)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: Color(0xFF5E45FF), width: 1.4),
        ),
      ),
      dividerTheme: DividerThemeData(color: Colors.black.withOpacity(0.05)),
      chipTheme: base.chipTheme.copyWith(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        backgroundColor: const Color(0xFFECE9FF),
        selectedColor: const Color(0xFF5E45FF),
      ),
    );
  }
}
