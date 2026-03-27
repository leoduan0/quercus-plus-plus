import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/models/assistant_models.dart';
import '../../../data/models/canvas_models.dart';
import '../../../data/providers.dart';
import '../../dashboard/controllers/canvas_data_controller.dart';
import '../../dashboard/controllers/syllabus_summary_controller.dart';

final assistantControllerProvider =
    StateNotifierProvider<AssistantController, AssistantState>(
      AssistantController.new,
    );

class AssistantController extends StateNotifier<AssistantState> {
  AssistantController(this._ref) : super(const AssistantState());

  final Ref _ref;

  Future<void> sendMessage(String text) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty || state.isLoading) return;

    final history = [
      ...state.messages,
      AssistantMessage(role: AssistantRole.user, content: trimmed),
    ];
    state = state.copyWith(messages: history, isLoading: true, error: null);

    try {
      final dataState = _ref.read(canvasDataControllerProvider);
      final canvasData = dataState.valueOrNull?.data;
      final summaries = _ref.read(syllabusSummaryControllerProvider).summaries;
      final repo = _ref.read(assistantRepositoryProvider);
      final reply = await repo.sendMessage(
        history: history,
        canvasData: canvasData,
        syllabusOverrides: summaries,
      );

      state = state.copyWith(
        messages: [
          ...history,
          AssistantMessage(role: AssistantRole.assistant, content: reply),
        ],
        isLoading: false,
      );
    } catch (error) {
      state = state.copyWith(isLoading: false, error: error.toString());
    }
  }

  void reset() {
    state = const AssistantState();
  }
}
