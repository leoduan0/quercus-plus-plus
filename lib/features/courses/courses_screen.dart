import 'package:collection/collection.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../data/models/assistant_models.dart';
import '../../data/models/canvas_models.dart';
import '../dashboard/controllers/canvas_data_controller.dart';
import '../dashboard/controllers/syllabus_summary_controller.dart';
import '../dashboard/widgets/dashboard_header.dart';

class CoursesScreen extends ConsumerWidget {
  const CoursesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dataState = ref.watch(canvasDataControllerProvider);
    final data = dataState.valueOrNull?.data;
    final isLoading = dataState.isLoading && data == null;
    final syllabusState = ref.watch(syllabusSummaryControllerProvider);

    return Column(
      children: [
        const DashboardHeader(title: 'Classes'),
        if (syllabusState.errorMessage != null)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            child: Material(
              color: Colors.red.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(16),
              child: ListTile(
                title: Text(
                  syllabusState.errorMessage!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
                trailing: IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => ref
                      .read(syllabusSummaryControllerProvider.notifier)
                      .resetError(),
                ),
              ),
            ),
          ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
            child: isLoading
                ? const _CoursesSkeleton()
                : data == null
                ? const _EmptyCoursesState()
                : _CoursesBody(courses: _activeCourses(data)),
          ),
        ),
      ],
    );
  }
}

class _CoursesBody extends StatelessWidget {
  const _CoursesBody({required this.courses});

  final List<CanvasCourse> courses;

  @override
  Widget build(BuildContext context) {
    if (courses.isEmpty) {
      return const _EmptyCoursesState();
    }

    return ListView.separated(
      itemCount: courses.length,
      separatorBuilder: (_, _) => const SizedBox(height: 18),
      itemBuilder: (context, index) => _CourseCard(
        course: courses[index],
        paletteColor: _courseColors[index % _courseColors.length],
      ),
    );
  }
}

class _CourseCard extends ConsumerStatefulWidget {
  const _CourseCard({required this.course, required this.paletteColor});

  final CanvasCourse course;
  final Color paletteColor;

  @override
  ConsumerState<_CourseCard> createState() => _CourseCardState();
}

class _CourseCardState extends ConsumerState<_CourseCard> {
  bool expanded = false;

  @override
  Widget build(BuildContext context) {
    final summaryState = ref.watch(syllabusSummaryControllerProvider);
    final summary = summaryState.summaries[widget.course.id];
    final isSummarizing = summaryState.isLoading(widget.course.id);

    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _CourseBadge(
                  color: widget.paletteColor,
                  label: widget.course.code ?? widget.course.name,
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.course.name,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (widget.course.assignments.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            '${widget.course.assignments.length} assignments tracked',
                            style: Theme.of(context).textTheme.bodyMedium
                                ?.copyWith(
                                  color: Theme.of(
                                    context,
                                  ).colorScheme.onSurfaceVariant,
                                ),
                          ),
                        ),
                    ],
                  ),
                ),
                OutlinedButton(
                  onPressed: () => setState(() => expanded = !expanded),
                  child: Text(expanded ? 'Hide details' : 'Details'),
                ),
              ],
            ),
            const SizedBox(height: 24),
            LayoutBuilder(
              builder: (context, constraints) {
                final isNarrow = constraints.maxWidth < 640;
                return Flex(
                  direction: isNarrow ? Axis.vertical : Axis.horizontal,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: _UpcomingList(
                        assignments: widget.course.assignments,
                      ),
                    ),
                    const SizedBox(width: 16, height: 16),
                    Expanded(child: _ActionNeeded(course: widget.course)),
                  ],
                );
              },
            ),
            if (expanded) ...[
              const SizedBox(height: 24),
              LayoutBuilder(
                builder: (context, constraints) {
                  final isNarrow = constraints.maxWidth < 800;
                  return Flex(
                    direction: isNarrow ? Axis.vertical : Axis.horizontal,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(child: _GradesSection(course: widget.course)),
                      const SizedBox(width: 16, height: 16),
                      Expanded(
                        child: _AnnouncementsSection(
                          announcements: widget.course.announcements,
                        ),
                      ),
                    ],
                  );
                },
              ),
              const SizedBox(height: 16),
              _SyllabusSection(
                course: widget.course,
                summary: summary,
                isSummarizing: isSummarizing,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _UpcomingList extends StatelessWidget {
  const _UpcomingList({required this.assignments});

  final List<CanvasAssignment> assignments;

  @override
  Widget build(BuildContext context) {
    final upcoming = assignments
        .where((a) => a.dueAt != null && a.dueAt!.isAfter(DateTime.now()))
        .sorted((a, b) => a.dueAt!.compareTo(b.dueAt!))
        .take(6)
        .toList();

    return _SectionCard(
      title: 'Upcoming deadlines',
      child: upcoming.isEmpty
          ? const Text('No pending work!')
          : Column(
              children: [
                for (final assignment in upcoming)
                  _ListTile(
                    title: assignment.name,
                    subtitle: assignment.pointsPossible != null
                        ? '${assignment.pointsPossible!.toStringAsFixed(0)} pts'
                        : null,
                    trailing: _relativeDate(assignment.dueAt),
                    highlightColor: _urgencyColor(assignment.dueAt),
                  ),
              ],
            ),
    );
  }
}

class _ActionNeeded extends StatelessWidget {
  const _ActionNeeded({required this.course});

  final CanvasCourse course;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final items = <_ActionItem>[];

    for (final assignment in course.assignments) {
      final due = assignment.dueAt;
      if (due == null) continue;
      if (assignment.submittedAt != null) continue;
      if (assignment.workflowState == 'graded') continue;
      if (due.isBefore(now)) continue;
      items.add(
        _ActionItem(
          title: assignment.name,
          detail: 'Due ${_relativeDate(due)}',
          chip: 'To Do',
        ),
      );
    }

    for (final submission in course.submissions) {
      if (submission.missing == true) {
        items.add(
          _ActionItem(
            title: submission.assignmentName ?? 'Missing submission',
            detail: 'Missing',
            chip: 'Missing',
          ),
        );
      }
      if (submission.comments.isNotEmpty && submission.gradedAt != null) {
        final lastComment = submission.comments.last;
        final gradedAt = submission.gradedAt!;
        if (gradedAt.isAfter(now.subtract(const Duration(days: 7)))) {
          items.add(
            _ActionItem(
              title: submission.assignmentName ?? 'Feedback available',
              detail: 'Feedback from ${lastComment.author ?? 'instructor'}',
              chip: 'Feedback',
            ),
          );
        }
      }
    }

    return _SectionCard(
      title: 'Action needed',
      child: items.isEmpty
          ? const Text('All quiet. Nothing pressing right now.')
          : Column(
              children: [
                for (final item in items.take(6))
                  _ListTile(
                    title: item.title,
                    subtitle: item.detail,
                    trailing: item.chip,
                  ),
              ],
            ),
    );
  }
}

class _GradesSection extends StatelessWidget {
  const _GradesSection({required this.course});

  final CanvasCourse course;

  @override
  Widget build(BuildContext context) {
    final graded =
        course.submissions
            .where((s) => s.score != null && s.pointsPossible != null)
            .toList()
          ..sort(
            (a, b) => (b.gradedAt ?? DateTime(0)).compareTo(
              a.gradedAt ?? DateTime(0),
            ),
          );

    final totalScore = graded.fold<double>(0, (sum, s) => sum + (s.score ?? 0));
    final totalPossible = graded.fold<double>(
      0,
      (sum, s) => sum + (s.pointsPossible ?? 0),
    );
    final computed = totalPossible > 0
        ? ((totalScore / totalPossible) * 100).round()
        : null;
    final display = course.grades?.currentScore?.round() ?? computed;

    return _SectionCard(
      title: 'Grades',
      child: graded.isEmpty && display == null
          ? const Text('No graded submissions yet.')
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (display != null)
                  Text(
                    '$display%',
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                if (graded.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: Column(
                      children: [
                        for (final submission in graded.take(5))
                          _ListTile(
                            title: submission.assignmentName ?? 'Assignment',
                            subtitle:
                                '${submission.score?.toStringAsFixed(1) ?? '-'} / ${submission.pointsPossible?.toStringAsFixed(1) ?? '-'}',
                            trailing:
                                '${_percent(submission.score, submission.pointsPossible)}%',
                          ),
                      ],
                    ),
                  ),
              ],
            ),
    );
  }
}

class _AnnouncementsSection extends StatelessWidget {
  const _AnnouncementsSection({required this.announcements});

  final List<CanvasAnnouncement> announcements;

  @override
  Widget build(BuildContext context) {
    final recent = announcements
        .sorted(
          (a, b) =>
              (b.postedAt ?? DateTime(0)).compareTo(a.postedAt ?? DateTime(0)),
        )
        .take(5)
        .toList();

    return _SectionCard(
      title: 'Announcements',
      child: recent.isEmpty
          ? const Text('No announcements posted.')
          : Column(
              children: [
                for (final ann in recent)
                  _ListTile(
                    title: ann.title,
                    subtitle: ann.message ?? 'No preview available.',
                    trailing: ann.postedAt != null
                        ? DateFormat.MMMd().format(ann.postedAt!)
                        : null,
                  ),
              ],
            ),
    );
  }
}

class _SyllabusSection extends ConsumerWidget {
  const _SyllabusSection({
    required this.course,
    required this.summary,
    required this.isSummarizing,
  });

  final CanvasCourse course;
  final SyllabusSummary? summary;
  final bool isSummarizing;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifier = ref.read(syllabusSummaryControllerProvider.notifier);

    return _SectionCard(
      title: 'Syllabus intel',
      child: summary == null
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Generate a quick summary + grade weights. We only use syllabus data already in Canvas.',
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: isSummarizing
                      ? null
                      : () => notifier.summarizeCourse(course),
                  icon: isSummarizing
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.auto_awesome),
                  label: Text(
                    isSummarizing ? 'Summarizing...' : 'Summarize syllabus',
                  ),
                ),
              ],
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  summary!.summary,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                if (summary!.weights.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final weight in summary!.weights)
                        Chip(
                          label: Text(
                            '${weight.category}: ${weight.weight.toStringAsFixed(1)}%',
                          ),
                        ),
                    ],
                  ),
                ],
              ],
            ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 12),
            child,
          ],
        ),
      ),
    );
  }
}

class _ListTile extends StatelessWidget {
  const _ListTile({
    required this.title,
    this.subtitle,
    this.trailing,
    this.highlightColor,
  });

  final String title;
  final String? subtitle;
  final String? trailing;
  final Color? highlightColor;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 4),
      color: highlightColor?.withValues(alpha: 0.15),
      child: ListTile(
        title: Text(title),
        subtitle: subtitle == null ? null : Text(subtitle!),
        trailing: trailing == null ? null : Text(trailing!),
      ),
    );
  }
}

class _CourseBadge extends StatelessWidget {
  const _CourseBadge({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Chip(
      backgroundColor: color.withValues(alpha: 0.18),
      label: Text(
        label.length > 8 ? label.substring(0, 8) : label,
        textAlign: TextAlign.center,
        style: Theme.of(context).textTheme.labelLarge?.copyWith(
          color: color,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _CoursesSkeleton extends StatelessWidget {
  const _CoursesSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      itemCount: 3,
      itemBuilder: (_, _) => const Card(
        margin: EdgeInsets.only(bottom: 12),
        child: SizedBox(height: 180),
      ),
    );
  }
}

class _EmptyCoursesState extends StatelessWidget {
  const _EmptyCoursesState();

  @override
  Widget build(BuildContext context) {
    final mutedColor = Theme.of(context).textTheme.bodySmall?.color;

    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.celebration_outlined, size: 56, color: mutedColor),
          const SizedBox(height: 12),
          Text(
            'We could not find any active courses yet.',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 6),
          Text(
            'Once Canvas returns data we will light this area up.',
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: mutedColor),
          ),
        ],
      ),
    );
  }
}

class _ActionItem {
  _ActionItem({required this.title, required this.detail, required this.chip});

  final String title;
  final String detail;
  final String chip;
}

String _relativeDate(DateTime? date) {
  if (date == null) return 'TBA';
  final now = DateTime.now();
  final diff = date.difference(now);
  if (diff.inDays == 0) return 'Today';
  if (diff.inDays == 1) return 'Tomorrow';
  if (diff.isNegative) return '${diff.inDays.abs()}d ago';
  if (diff.inDays < 7) return 'In ${diff.inDays}d';
  return DateFormat.MMMd().format(date);
}

Color _urgencyColor(DateTime? date) {
  if (date == null) return Colors.transparent;
  final diff = date.difference(DateTime.now());
  if (diff.isNegative) return Colors.red;
  if (diff.inHours <= 24) return Colors.orangeAccent;
  if (diff.inDays <= 3) return Colors.amber;
  return Colors.blueGrey;
}

int _percent(double? score, double? possible) {
  if (score == null || possible == null || possible == 0) return 0;
  return ((score / possible) * 100).round();
}

List<CanvasCourse> _activeCourses(CanvasData data) {
  final now = DateTime.now();
  final todoIds = data.todo.map((t) => t.courseId).whereType<String>().toSet();
  return data.courses.where((course) {
    final sixtyDaysAgo = now.subtract(const Duration(days: 60));
    final thirtyDaysAgo = now.subtract(const Duration(days: 30));
    final hasAssignments = course.assignments.any(
      (assignment) =>
          assignment.dueAt != null && assignment.dueAt!.isAfter(sixtyDaysAgo),
    );
    final hasAnnouncements = course.announcements.any(
      (announcement) =>
          announcement.postedAt != null &&
          announcement.postedAt!.isAfter(thirtyDaysAgo),
    );
    return hasAssignments || hasAnnouncements || todoIds.contains(course.id);
  }).toList();
}

const _courseColors = [
  Color(0xFFC45A2D),
  Color(0xFF1F6F8B),
  Color(0xFF2F855A),
  Color(0xFFD69E2E),
  Color(0xFFB83280),
  Color(0xFF2B6CB0),
  Color(0xFF805AD5),
  Color(0xFFC05621),
];
