import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/config/app_config.dart';
import 'repositories/assistant_repository.dart';
import 'repositories/canvas_repository.dart';
import 'services/canvas_api_client.dart';
import 'services/openai_client.dart';

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: AppConfig.canvasBaseUrl,
      connectTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 20),
      sendTimeout: const Duration(seconds: 20),
    ),
  );
  dio.interceptors.add(LogInterceptor(responseBody: false, requestBody: false));
  return dio;
});

final canvasApiClientProvider = Provider<CanvasApiClient>((ref) {
  final dio = ref.watch(dioProvider);
  return CanvasApiClient(dio, baseUrl: AppConfig.canvasBaseUrl);
});

final canvasRepositoryProvider = Provider<CanvasRepository>((ref) {
  final client = ref.watch(canvasApiClientProvider);
  return CanvasRepository(client);
});

final openAiClientProvider = Provider<OpenAiClient>((_) => OpenAiClient());

final assistantRepositoryProvider = Provider<AssistantRepository>((ref) {
  final client = ref.watch(openAiClientProvider);
  return AssistantRepository(client);
});
