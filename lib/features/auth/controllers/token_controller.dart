import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

final tokenControllerProvider = AsyncNotifierProvider<TokenController, String?>(
  TokenController.new,
);

class TokenController extends AsyncNotifier<String?> {
  static const _tokenKey = 'quercusToken';
  SharedPreferences? _prefs;

  @override
  Future<String?> build() async {
    _prefs ??= await SharedPreferences.getInstance();
    return _prefs!.getString(_tokenKey);
  }

  Future<void> persist(String token) async {
    if (token.isEmpty) return;
    _prefs ??= await SharedPreferences.getInstance();
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      await _prefs!.setString(_tokenKey, token);
      return token;
    });
  }

  Future<void> clear() async {
    _prefs ??= await SharedPreferences.getInstance();
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      await _prefs!.remove(_tokenKey);
      return null;
    });
  }
}
