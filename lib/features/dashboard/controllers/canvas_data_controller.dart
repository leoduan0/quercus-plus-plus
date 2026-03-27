import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../data/models/canvas_models.dart';
import '../../../data/providers.dart';
import '../../../data/storage/canvas_cache.dart';
import '../../auth/controllers/token_controller.dart';

final canvasDataControllerProvider =
    AsyncNotifierProvider<CanvasDataController, CanvasDataState>(
      CanvasDataController.new,
    );

class CanvasDataController extends AsyncNotifier<CanvasDataState> {
  static const _staleDuration = Duration(minutes: 15);
  CanvasCache? _cache;

  @override
  Future<CanvasDataState> build() async {
    final token = ref.watch(tokenControllerProvider).valueOrNull;
    if (token == null) {
      return const CanvasDataState();
    }

    _cache ??= CanvasCache(await SharedPreferences.getInstance());
    final cached = _cache!.read();
    if (cached != null &&
        DateTime.now().difference(cached.fetchedAt) < _staleDuration) {
      return CanvasDataState(data: cached);
    }

    return _fetchAndCache(token);
  }

  Future<CanvasDataState> _fetchAndCache(String token) async {
    final repo = ref.read(canvasRepositoryProvider);
    try {
      CanvasData? fresh;
      fresh = await repo.fetchAllData(
        token: token,
        onProgress: (message) => _updateProgress(message),
      );
      await _cache?.write(fresh);
      return CanvasDataState(data: fresh);
    } catch (error, stackTrace) {
      _updateProgress('');
      return CanvasDataState(
        data: state.value?.data,
        errorMessage: error.toString(),
        stackTrace: stackTrace,
      );
    } finally {
      _updateProgress('');
    }
  }

  Future<void> refresh() async {
    final token = ref.watch(tokenControllerProvider).valueOrNull;
    if (token == null) return;
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => _fetchAndCache(token));
  }

  Future<void> clearCache() async {
    await _cache?.clear();
  }

  void _updateProgress(String message) {
    final current = state.value ?? const CanvasDataState();
    state = AsyncValue.data(current.copyWith(progressMessage: message));
  }
}

class CanvasDataState {
  static const _sentinel = Object();

  const CanvasDataState({
    this.data,
    this.progressMessage = '',
    this.errorMessage,
    this.stackTrace,
  });

  final CanvasData? data;
  final String progressMessage;
  final String? errorMessage;
  final StackTrace? stackTrace;

  bool get hasData => data != null;

  CanvasDataState copyWith({
    CanvasData? data,
    String? progressMessage,
    Object? errorMessage = _sentinel,
    StackTrace? stackTrace,
  }) {
    return CanvasDataState(
      data: data ?? this.data,
      progressMessage: progressMessage ?? this.progressMessage,
      errorMessage: identical(errorMessage, _sentinel)
          ? this.errorMessage
          : errorMessage as String?,
      stackTrace: stackTrace ?? this.stackTrace,
    );
  }
}
