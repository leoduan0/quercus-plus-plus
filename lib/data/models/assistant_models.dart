import 'package:uuid/uuid.dart';

import 'canvas_models.dart';

enum AssistantRole { user, assistant }

class AssistantMessage {
  AssistantMessage({
    required this.role,
    required this.content,
    DateTime? timestamp,
    String? id,
    this.isError = false,
  }) : timestamp = timestamp ?? DateTime.now(),
       id = id ?? const Uuid().v4();

  final String id;
  final AssistantRole role;
  final String content;
  final DateTime timestamp;
  final bool isError;
}

class SyllabusSummary {
  SyllabusSummary({required this.summary, required this.weights});

  final String summary;
  final List<SyllabusWeight> weights;
}

class AssistantState {
  static const _sentinel = Object();

  const AssistantState({
    this.messages = const [],
    this.isLoading = false,
    this.error,
  });

  final List<AssistantMessage> messages;
  final bool isLoading;
  final String? error;

  AssistantState copyWith({
    List<AssistantMessage>? messages,
    bool? isLoading,
    Object? error = _sentinel,
  }) {
    return AssistantState(
      messages: messages ?? this.messages,
      isLoading: isLoading ?? this.isLoading,
      error: identical(error, _sentinel) ? this.error : error as String?,
    );
  }
}
