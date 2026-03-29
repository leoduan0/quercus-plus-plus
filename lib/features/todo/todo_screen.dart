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

    return ListView.separated(
      itemCount: groups.length,
      separatorBuilder: (_, _) => const SizedBox(height: 18),
      itemBuilder: (context, index) {
        final group = groups[index];
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      group.label,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    Chip(label: Text('${group.items.length}')),
                  ],
                ),
                const SizedBox(height: 8),
                if (group.items.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Text(
                      group.emptyMessage,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  )
                else
                  for (final item in group.items)
                    Card(
                      margin: const EdgeInsets.symmetric(vertical: 6),
                      color: item.statusColor.withValues(alpha: 0.08),
                      child: ListTile(
                        leading: Chip(
                          backgroundColor: item.courseColor.withValues(
                            alpha: 0.15,
                          ),
                          label: Text(
                            item.courseCode,
                            style: TextStyle(
                              color: item.courseColor,
                              fontWeight: FontWeight.w600,
                              fontSize: 10,
                            ),
                          ),
                        ),
                        title: Text(item.title),
                        subtitle: Text(
                          DateFormat('EEE, MMM d • h:mm a').format(item.dueAt),
                        ),
                        trailing: Icon(
                          Icons.circle,
                          size: 12,
                          color: item.statusColor,
                        ),
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
      itemBuilder: (_, _) => const Card(
        margin: EdgeInsets.only(bottom: 12),
        child: SizedBox(height: 120),
      ),
    );
  }
}

class _TodoEmptyState extends StatelessWidget {
  const _TodoEmptyState({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final mutedColor = Theme.of(context).textTheme.bodySmall?.color;

    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.inbox_outlined, size: 56, color: mutedColor),
          const SizedBox(height: 12),
          Text(message, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 6),
          Text(
            'Your planner will populate when Canvas assignments include due dates.',
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: mutedColor),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _TodoGroup {
  _TodoGroup({
    required this.label,
    required this.items,
    required this.emptyMessage,
  });

  final String label;
  final List<_TodoItem> items;
  final String emptyMessage;
}

class _TodoItem {
  _TodoItem({
    required this.title,
    required this.courseCode,
    required this.courseColor,
    required this.dueAt,
    required this.statusColor,
  });

  final String title;
  final String courseCode;
  final Color courseColor;
  final DateTime dueAt;
  final Color statusColor;
}

List<_TodoGroup> _groupAssignments(List<CanvasCourse> courses) {
  final overdue = <_TodoItem>[];
  final dueToday = <_TodoItem>[];
  final nextSevenDays = <_TodoItem>[];
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final sevenDaysFromToday = today.add(const Duration(days: 7));

  for (var i = 0; i < courses.length; i++) {
    final course = courses[i];
    final courseCode = _shortCode(course);
    final courseColor = _courseColors[i % _courseColors.length];

    for (final assignment in course.assignments) {
      final due = assignment.dueAt;
      if (due == null) continue;
      if (assignment.workflowState == 'graded') continue;
      if (assignment.submittedAt != null) continue;

      final dueDate = DateTime(due.year, due.month, due.day);
      final isOverdue = due.isBefore(now);
      final isToday = dueDate == today;
      final inNextSevenDays =
          dueDate.isAfter(today) && !dueDate.isAfter(sevenDaysFromToday);

      if (!isOverdue && !isToday && !inNextSevenDays) {
        continue;
      }

      final item = _TodoItem(
        title: assignment.name,
        courseCode: courseCode,
        courseColor: courseColor,
        dueAt: due,
        statusColor: _statusColor(due),
      );

      if (isOverdue) {
        overdue.add(item);
      } else if (isToday) {
        dueToday.add(item);
      } else {
        nextSevenDays.add(item);
      }
    }
  }

  overdue.sort((a, b) => a.dueAt.compareTo(b.dueAt));
  dueToday.sort((a, b) => a.dueAt.compareTo(b.dueAt));
  nextSevenDays.sort((a, b) => a.dueAt.compareTo(b.dueAt));

  return [
    _TodoGroup(
      label: 'Overdue',
      items: overdue,
      emptyMessage: 'No overdue tasks. Nice.',
    ),
    _TodoGroup(
      label: 'Due today',
      items: dueToday,
      emptyMessage: 'Nothing due today.',
    ),
    _TodoGroup(
      label: 'Next 7 days',
      items: nextSevenDays,
      emptyMessage: 'No tasks due in the next 7 days.',
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
  final head = source.split(RegExp('[:-]')).first.trim();
  final safe = head.isEmpty ? source : head;
  final end = math.min(8, safe.length);
  return safe.substring(0, end).toUpperCase();
}

Color _statusColor(DateTime due) {
  final diff = due.difference(DateTime.now());
  if (diff.isNegative) return Colors.red;
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
