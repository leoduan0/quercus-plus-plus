import 'package:flutter_dotenv/flutter_dotenv.dart';

class AppConfig {
  static String get canvasBaseUrl =>
      dotenv.maybeGet('CANVAS_BASE_URL')?.trim().isNotEmpty == true
      ? dotenv.get('CANVAS_BASE_URL').trim()
      : 'https://q.utoronto.ca/api/v1';

  static String? get openAiApiKey =>
      dotenv.maybeGet('OPENAI_API_KEY')?.trim().isNotEmpty == true
      ? dotenv.get('OPENAI_API_KEY').trim()
      : null;

  static String get openAiModel =>
      dotenv.maybeGet('OPENAI_MODEL')?.trim().isNotEmpty == true
      ? dotenv.get('OPENAI_MODEL').trim()
      : 'gpt-4.1-mini';

  static String get openAiBaseUrl =>
      dotenv.maybeGet('OPENAI_BASE_URL')?.trim().isNotEmpty == true
      ? dotenv.get('OPENAI_BASE_URL').trim()
      : 'https://api.openai.com/v1';
}
