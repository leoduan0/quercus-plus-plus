import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/canvas_models.dart';

class CanvasCache {
  CanvasCache(this._prefs);

  static const _cacheKey = 'quercusData';

  final SharedPreferences _prefs;

  CanvasData? read() {
    final raw = _prefs.getString(_cacheKey);
    if (raw == null) return null;
    try {
      final map = jsonDecode(raw) as Map<String, dynamic>;
      return CanvasData.fromJson(map);
    } catch (_) {
      return null;
    }
  }

  Future<void> write(CanvasData data) async {
    await _prefs.setString(_cacheKey, jsonEncode(data.toJson()));
  }

  Future<void> clear() async {
    await _prefs.remove(_cacheKey);
  }
}
