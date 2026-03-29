import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../../core/config/app_config.dart';
import '../models/assistant_models.dart';

class OpenAiClient {
  OpenAiClient({http.Client? httpClient})
    : _http = httpClient ?? http.Client(),
      apiKey = AppConfig.openAiApiKey,
      model = AppConfig.openAiModel,
      baseUrl = AppConfig.openAiBaseUrl;

  final http.Client _http;
  final String? apiKey;
  final String model;
  final String baseUrl;

  Future<Map<String, dynamic>> createChatCompletion({
    required String systemPrompt,
    required List<AssistantMessage> messages,
    required int maxCompletionTokens,
    required double temperature,
    required double topP,
  }) async {
    if (apiKey == null || apiKey!.isEmpty) {
      throw StateError('Missing OPENAI_API_KEY.');
    }

    final uri = Uri.parse('$baseUrl/chat/completions');
    final body = jsonEncode({
      'model': model,
      'messages': [
        {'role': 'system', 'content': systemPrompt},
        ...messages.map(
          (msg) => {
            'role': msg.role == AssistantRole.user ? 'user' : 'assistant',
            'content': msg.content,
          },
        ),
      ],
      'max_completion_tokens': maxCompletionTokens,
      'temperature': temperature,
      'top_p': topP,
    });

    final response = await _http.post(
      uri,
      headers: {
        HttpHeaders.authorizationHeader: 'Bearer $apiKey',
        HttpHeaders.contentTypeHeader: 'application/json',
      },
      body: body,
    );

    if (response.statusCode >= 400) {
      throw HttpException(
        'OpenAI error ${response.statusCode}: ${response.body}',
        uri: uri,
      );
    }

    return jsonDecode(response.body) as Map<String, dynamic>;
  }
}
