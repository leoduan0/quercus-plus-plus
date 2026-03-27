import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/models/assistant_models.dart';
import '../../../data/models/canvas_models.dart';
import '../../../data/providers.dart';

final syllabusSummaryControllerProvider =
    StateNotifierProvider<SyllabusSummaryController, SyllabusSummaryState>(
      SyllabusSummaryController.new,
    );

class SyllabusSummaryController extends StateNotifier<SyllabusSummaryState> {
  SyllabusSummaryController(this._ref) : super(const SyllabusSummaryState());

  final Ref _ref;

  Future<void> summarizeCourse(CanvasCourse course) async {
    final id = course.id;
    state = state.copyWith(
      loadingCourseIds: {...state.loadingCourseIds, id},
      errorMessage: null,
    );

    try {
      final repo = _ref.read(assistantRepositoryProvider);
      final summary = await repo.summarizeCourse(course);
      final updated = Map<String, SyllabusSummary>.from(state.summaries)
        ..[id] = summary;
      final loading = {...state.loadingCourseIds}..remove(id);
      state = state.copyWith(summaries: updated, loadingCourseIds: loading);
    } catch (error) {
      final loading = {...state.loadingCourseIds}..remove(id);
      state = state.copyWith(
        loadingCourseIds: loading,
        errorMessage: error.toString(),
      );
    }
  }

  void resetError() {
    state = state.copyWith(errorMessage: null);
  }
}

class SyllabusSummaryState {
  static const _sentinel = Object();

  const SyllabusSummaryState({
    this.summaries = const {},
    this.loadingCourseIds = const {},
    this.errorMessage,
  });

  final Map<String, SyllabusSummary> summaries;
  final Set<String> loadingCourseIds;
  final String? errorMessage;

  bool isLoading(String courseId) => loadingCourseIds.contains(courseId);

  SyllabusSummaryState copyWith({
    Map<String, SyllabusSummary>? summaries,
    Set<String>? loadingCourseIds,
    Object? errorMessage = _sentinel,
  }) {
    return SyllabusSummaryState(
      summaries: summaries ?? this.summaries,
      loadingCourseIds: loadingCourseIds ?? this.loadingCourseIds,
      errorMessage: identical(errorMessage, _sentinel)
          ? this.errorMessage
          : errorMessage as String?,
    );
  }
}
