import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../data/models/canvas_models.dart';
import '../dashboard/controllers/canvas_data_controller.dart';
import '../dashboard/widgets/dashboard_header.dart';

class CalendarScreen extends ConsumerWidget {
  const CalendarScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dataState = ref.watch(canvasDataControllerProvider);
    final data = dataState.valueOrNull?.data;
    final isLoading = dataState.isLoading && data == null;

    return Column(
      children: [
        const DashboardHeader(title: 'Calendar'),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
            child: isLoading
                ? const _CalendarSkeleton()
                : data == null
                ? const _CalendarEmptyState(
                    message: 'Once data is fetched, upcoming events land here.',
                  )
                : _CalendarTimeline(items: _buildItems(data)),
          ),
        ),
      ],
    );
  }
}

class _CalendarTimeline extends StatelessWidget {
  const _CalendarTimeline({required this.items});

  final List<_CalendarItem> items;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return const _CalendarEmptyState(
        message: 'No upcoming events or deadlines on record.',
      );
    }

    return ListView.separated(
      itemCount: items.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final item = items[index];
        return Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: Colors.black.withOpacity(0.05)),
            color: Colors.white,
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 14,
                height: 14,
                margin: const EdgeInsets.only(top: 6, right: 16),
                decoration: BoxDecoration(
                  color: item.color,
                  shape: BoxShape.circle,
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      DateFormat('EEEE, MMM d • h:mm a').format(item.time),
                      style: Theme.of(
                        context,
                      ).textTheme.bodyMedium?.copyWith(color: Colors.black54),
                    ),
                    if (item.detail != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(
                          item.detail!,
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(color: Colors.black54),
                        ),
                      ),
                  ],
                ),
              ),
              Chip(
                label: Text(item.tag),
                backgroundColor: item.color.withOpacity(0.12),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _CalendarSkeleton extends StatelessWidget {
  const _CalendarSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      itemCount: 4,
      itemBuilder: (_, __) => Container(
        margin: const EdgeInsets.only(bottom: 14),
        height: 110,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
        ),
      ),
    );
  }
}

class _CalendarEmptyState extends StatelessWidget {
  const _CalendarEmptyState({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.event_available_outlined,
            size: 56,
            color: Colors.black.withOpacity(0.4),
          ),
          const SizedBox(height: 12),
          Text(message, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 6),
          Text(
            'Calendar pulls both Canvas events and assignment due dates.',
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

class _CalendarItem {
  _CalendarItem({
    required this.title,
    required this.time,
    required this.tag,
    required this.color,
    this.detail,
  });

  final String title;
  final DateTime time;
  final String tag;
  final Color color;
  final String? detail;
}

List<_CalendarItem> _buildItems(CanvasData data) {
  final items = <_CalendarItem>[];
  final palette = _courseColors;
  final now = DateTime.now();

  for (var i = 0; i < data.courses.length; i++) {
    final course = data.courses[i];
    final color = palette[i % palette.length];
    final tag = course.code ?? course.name;

    for (final assignment in course.assignments) {
      final due = assignment.dueAt;
      if (due == null || due.isBefore(now.subtract(const Duration(days: 1)))) {
        continue;
      }
      items.add(
        _CalendarItem(
          title: assignment.name,
          time: due,
          tag: tag,
          color: color,
          detail: assignment.pointsPossible != null
              ? '${assignment.pointsPossible!.toStringAsFixed(0)} pts'
              : null,
        ),
      );
    }
  }

  for (final event in data.upcoming) {
    final start = event.startAt;
    if (start == null ||
        start.isBefore(now.subtract(const Duration(days: 1)))) {
      continue;
    }
    final contextCode = event.contextCode ?? '';
    final courseId = contextCode.replaceAll('course_', '');
    final courseIndex = data.courses.indexWhere((c) => c.id == courseId);
    final color = courseIndex >= 0
        ? palette[courseIndex % palette.length]
        : Colors.black54;
    final tag = event.contextName ?? event.type ?? 'Event';
    items.add(
      _CalendarItem(
        title: event.title,
        time: start,
        tag: tag,
        color: color,
        detail: event.locationName,
      ),
    );
  }

  items.sort((a, b) => a.time.compareTo(b.time));
  return items;
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
