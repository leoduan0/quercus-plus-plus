import 'dart:convert';

import '../models/assistant_models.dart';
import '../models/canvas_models.dart';
import '../services/openai_client.dart';

class AssistantRepository {
  AssistantRepository(this._client);

  final OpenAiClient _client;

  Future<String> sendMessage({
    required List<AssistantMessage> history,
    CanvasData? canvasData,
    Map<String, SyllabusSummary> syllabusOverrides = const {},
  }) async {
    if (history.isEmpty) {
      throw ArgumentError(
        'Conversation history must include at least one message.',
      );
    }

    final latest = history.last.content;
    final route = await _routeQuery(latest);
    final context = route == _QueryRoute.structuredData
        ? _structuredContext(canvasData, syllabusOverrides)
        : _knowledgeContext();

    final response = await _client.createChatCompletion(
      systemPrompt: _systemPrompt(context),
      messages: history,
      maxCompletionTokens: 1200,
      temperature: 0.15,
      topP: 0.9,
    );
    return _extractText(response);
  }

  Future<SyllabusSummary> summarizeCourse(CanvasCourse course) async {
    final syllabusText = course.syllabusBody;
    if (syllabusText == null || syllabusText.trim().length < 50) {
      throw StateError('No syllabus body found for ${course.name}.');
    }

    final truncatedLength = syllabusText.length > 6000
        ? 6000
        : syllabusText.length;
    final prompt =
        'Given this course syllabus text, extract:\n'
        '1. A concise 2-3 sentence summary of the course\n'
        '2. The grade weight breakdown as a JSON array\n\n'
        'Respond in EXACTLY this format (no extra prose):\n'
        'SUMMARY: <summary>\n'
        'WEIGHTS: [{"category": "...", "weight": <number>}, ...]\n\n'
        'Syllabus text (truncated to 6000 chars):\n'
        '${syllabusText.substring(0, truncatedLength)}';

    final response = await _client.createChatCompletion(
      systemPrompt:
          'You turn raw syllabi into terse summaries and weight tables.',
      messages: [AssistantMessage(role: AssistantRole.user, content: prompt)],
      maxCompletionTokens: 800,
      temperature: 0.1,
      topP: 0.9,
    );
    final text = _extractText(response);

    final summaryMatch = RegExp(
      r'SUMMARY:\s*([\s\S]+?)(?=\nWEIGHTS:|$)',
    ).firstMatch(text);
    final weightsMatch = RegExp(r'WEIGHTS:\s*(\[[\s\S]*\])').firstMatch(text);
    final summary = summaryMatch?.group(1)?.trim() ?? text.trim();

    List<SyllabusWeight> weights = [];
    if (weightsMatch != null) {
      try {
        final parsed = jsonDecode(weightsMatch.group(1)!) as List<dynamic>;
        weights = parsed
            .map(
              (entry) => SyllabusWeight.fromJson(
                Map<String, dynamic>.from(entry as Map),
              ),
            )
            .toList();
      } catch (_) {
        weights = [];
      }
    }

    return SyllabusSummary(summary: summary, weights: weights);
  }

  Future<_QueryRoute> _routeQuery(String message) async {
    final response = await _client.createChatCompletion(
      systemPrompt: _routerPrompt,
      messages: [AssistantMessage(role: AssistantRole.user, content: message)],
      maxCompletionTokens: 64,
      temperature: 0,
      topP: 0.1,
    );
    final text = _extractText(response);
    final match = RegExp(r'\{[^}]+\}').firstMatch(text);
    try {
      final parsed =
          jsonDecode(match?.group(0) ?? text) as Map<String, dynamic>;
      final retriever = parsed['retriever'] as String? ?? 'structured_data';
      return retriever == 'knowledge_base'
          ? _QueryRoute.knowledgeBase
          : _QueryRoute.structuredData;
    } catch (_) {
      return _QueryRoute.structuredData;
    }
  }

  String _extractText(Map<String, dynamic> body) {
    final choices = body['choices'];
    if (choices is List && choices.isNotEmpty) {
      final first = choices.first;
      if (first is Map) {
        final message = first['message'];
        if (message is Map) {
          final content = message['content'];
          if (content is String && content.trim().isNotEmpty) {
            return content;
          }
        }
      }
    }
    throw StateError('Unexpected OpenAI response: $body');
  }

  String _structuredContext(
    CanvasData? data,
    Map<String, SyllabusSummary> overrides,
  ) {
    if (data == null) {
      return 'No course data available.';
    }

    final payload = data.toJson();
    if (overrides.isNotEmpty) {
      final courses = payload['courses'] as List<dynamic>;
      for (final entry in courses) {
        final courseId = entry['id'].toString();
        final override = overrides[courseId];
        if (override != null) {
          entry['syllabusSummary'] = override.summary;
          entry['syllabusWeights'] = override.weights
              .map((w) => w.toJson())
              .toList();
        }
      }
    }

    return 'STUDENT COURSE DATA (structured records)\n${jsonEncode(payload)}';
  }

  String _knowledgeContext() {
    return 'Use general academic knowledge and study strategies when you lack course data.';
  }

  String _systemPrompt(String context) {
    return 'You are Quercus++, an academic assistant for University of Toronto students. '
        'Keep answers terse, use bullet points, include concrete assignment names, dates, and numbers when available. '
        'If referencing grades, show brief math. If information is missing, state that limitation. '
        "Today's date is ${DateTime.now().toIso8601String().split('T').first}.\n\n$context";
  }
}

enum _QueryRoute { structuredData, knowledgeBase }

const _routerPrompt =
    'You are a query router. Given a user question and two available retrievers,\n'
    'choose which retriever best answers the question.\n\n'
    'Retrievers:\n'
    '1. "structured_data" - best when the question references Canvas data such as grades, due dates, or events.\n'
    '2. "knowledge_base" - best for general academic advice or concept explanations.\n\n'
    'Respond with ONLY JSON: {"retriever": "structured_data"} or {"retriever": "knowledge_base"}.';
