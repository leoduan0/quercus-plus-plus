import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../data/models/canvas_models.dart';
import '../dashboard/controllers/canvas_data_controller.dart';
import '../dashboard/widgets/dashboard_header.dart';

class TodoScreen extends ConsumerWidget {
  const TodoScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dataState = ref.watch(canvasDataControllerProvider);
    final data = dataState.valueOrNull?.data;
    final isLoading = dataState.isLoading && data == null;

    return Column(
      children: [
        const DashboardHeader(title: 'To-Do'),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
            child: isLoading
                ? const _TodoSkeleton()
                : data == null
                ? const _TodoEmptyState(
                    message: 'Load your courses first to see assignments.',
                  )
                : _TodoBody(courses: data.courses),
          ),
        ),
      ],
    );
  }
}

class _TodoBody extends StatelessWidget {
  const _TodoBody({required this.courses});

  final List<CanvasCourse> courses;

  @override
  Widget build(BuildContext context) {
    final groups = _groupAssignments(courses);
    if (groups.isEmpty) {
      return const _TodoEmptyState(
        message: 'All caught up — no assignments on the radar.',
      );
    }

    return ListView.separated(
      itemCount: groups.length,
      separatorBuilder: (_, __) => const SizedBox(height: 18),
      itemBuilder: (context, index) {
        final group = groups[index];
        return Card(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
          ),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      group.label,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Chip(label: Text('${group.items.length}')),
                  ],
                ),
                const SizedBox(height: 16),
                for (final item in group.items)
                  Container(
                    margin: const EdgeInsets.symmetric(vertical: 6),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 14,
                    ),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: item.statusColor.withOpacity(0.25),
                      ),
                      color: item.statusColor.withOpacity(0.08),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(14),
                            color: item.courseColor.withOpacity(0.15),
                          ),
                          child: Text(
                            item.courseCode,
                            style: TextStyle(
                              color: item.courseColor,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                item.title,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${item.relativeDue} • ${DateFormat('EEE, MMM d • h:mm a').format(item.dueAt)}',
                                style: Theme.of(context).textTheme.bodySmall
                                    ?.copyWith(color: Colors.black54),
                              ),
                            ],
                          ),
                        ),
                        Chip(
                          label: Text(item.submitted ? 'Submitted' : 'Pending'),
                          backgroundColor: item.submitted
                              ? Colors.green.withOpacity(0.15)
                              : Colors.amber.withOpacity(0.15),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _TodoSkeleton extends StatelessWidget {
  const _TodoSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      itemCount: 3,
      itemBuilder: (_, __) => Container(
        margin: const EdgeInsets.only(bottom: 16),
        height: 160,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
        ),
      ),
    );
  }
}

class _TodoEmptyState extends StatelessWidget {
  const _TodoEmptyState({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.inbox_outlined,
            size: 56,
            color: Colors.black.withOpacity(0.4),
          ),
          const SizedBox(height: 12),
          Text(
            message,
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 6),
          Text(
            'Your planner will populate when Canvas assignments include due dates.',
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: Colors.black54),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _TodoGroup {
  _TodoGroup({required this.label, required this.items});

  final String label;
  final List<_TodoItem> items;
}

class _TodoItem {
  _TodoItem({
    required this.title,
    required this.courseCode,
    required this.courseColor,
    required this.relativeDue,
    required this.dueAt,
    required this.submitted,
    required this.statusColor,
  });

  final String title;
  final String courseCode;
  final Color courseColor;
  final String relativeDue;
  final DateTime dueAt;
  final bool submitted;
  final Color statusColor;
}

List<_TodoGroup> _groupAssignments(List<CanvasCourse> courses) {
  final now = DateTime.now();
  final items = <_TodoItem>[];

  for (var i = 0; i < courses.length; i++) {
    final course = courses[i];
    final courseCode = _shortCode(course);
    final courseColor = _courseColors[i % _courseColors.length];

    for (final assignment in course.assignments) {
      final due = assignment.dueAt;
      if (due == null) continue;
      if (assignment.workflowState == 'graded') continue;

      items.add(
        _TodoItem(
          title: assignment.name,
          courseCode: courseCode,
          courseColor: courseColor,
          relativeDue: _relativeLabel(due),
          dueAt: due,
          submitted: assignment.submittedAt != null,
          statusColor: _statusColor(due),
        ),
      );
    }
  }

  final grouped = <String, List<_TodoItem>>{};
  for (final item in items) {
    grouped.putIfAbsent(item.relativeDue, () => []).add(item);
  }

  final order = {'Overdue': 0, 'Due today': 1, 'This week': 2, 'Later': 3};

  final sortedKeys = grouped.keys.toList()
    ..sort((a, b) => (order[a] ?? 99).compareTo(order[b] ?? 99));

  return [
    for (final key in sortedKeys)
      _TodoGroup(
        label: key,
        items: grouped[key]!..sort((a, b) => a.dueAt.compareTo(b.dueAt)),
      ),
  ];
}

String _shortCode(CanvasCourse course) {
  final raw = (course.code ?? course.name).trim();
  final source = raw.isEmpty ? 'COURSE' : raw;
  final match = RegExp(
    r'[A-Z]{3}\d{3}',
    caseSensitive: false,
  ).firstMatch(source);
  if (match != null) {
    return match.group(0)!.toUpperCase();
  }
  final head = source.split(RegExp('[:\\-–]')).first.trim();
  final safe = head.isEmpty ? source : head;
  final end = math.min(8, safe.length);
  return safe.substring(0, end).toUpperCase();
}

String _relativeLabel(DateTime due) {
  final now = DateTime.now();
  final diff = due.difference(now);
  if (diff.isNegative) return 'Overdue';
  if (diff.inDays == 0) return 'Due today';
  if (diff.inDays <= 7) return 'This week';
  return 'Later';
}

Color _statusColor(DateTime due) {
  final diff = due.difference(DateTime.now());
  if (diff.isNegative) return Colors.redAccent;
  if (diff.inHours <= 24) return Colors.orangeAccent;
  if (diff.inDays <= 3) return Colors.amber;
  return Colors.blueGrey;
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
