import 'package:flutter_dotenv/flutter_dotenv.dart';

class AppConfig {
  static String get canvasBaseUrl =>
      dotenv.maybeGet('CANVAS_BASE_URL')?.trim().isNotEmpty == true
      ? dotenv.get('CANVAS_BASE_URL').trim()
      : 'https://q.utoronto.ca/api/v1';

  static String? get awsAccessKeyId =>
      dotenv.maybeGet('AWS_ACCESS_KEY_ID')?.trim().isNotEmpty == true
      ? dotenv.get('AWS_ACCESS_KEY_ID').trim()
      : null;

  static String? get awsSecretAccessKey =>
      dotenv.maybeGet('AWS_SECRET_ACCESS_KEY')?.trim().isNotEmpty == true
      ? dotenv.get('AWS_SECRET_ACCESS_KEY').trim()
      : null;

  static String? get awsSessionToken =>
      dotenv.maybeGet('AWS_SESSION_TOKEN')?.trim().isNotEmpty == true
      ? dotenv.get('AWS_SESSION_TOKEN').trim()
      : null;

  static String get awsRegion =>
      dotenv.maybeGet('AWS_REGION')?.trim().isNotEmpty == true
      ? dotenv.get('AWS_REGION').trim()
      : 'us-west-2';

  static String get bedrockModelId =>
      dotenv.maybeGet('BEDROCK_MODEL_ID')?.trim().isNotEmpty == true
      ? dotenv.get('BEDROCK_MODEL_ID').trim()
      : 'us.amazon.nova-pro-v1:0';
}
