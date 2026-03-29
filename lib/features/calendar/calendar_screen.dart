import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:table_calendar/table_calendar.dart';

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

class _CalendarTimeline extends StatefulWidget {
  const _CalendarTimeline({required this.items});

  final List<_CalendarItem> items;

  @override
  State<_CalendarTimeline> createState() => _CalendarTimelineState();
}

class _CalendarTimelineState extends State<_CalendarTimeline> {
  late DateTime _focusedDay;
  DateTime? _selectedDay;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _focusedDay = now;
    _selectedDay = now;
  }

  DateTime _normalizeDate(DateTime date) {
    return DateTime(date.year, date.month, date.day);
  }

  List<_CalendarItem> _itemsForDay(DateTime day) {
    final normalized = _normalizeDate(day);
    return widget.items
        .where((item) => _normalizeDate(item.time) == normalized)
        .toList()
      ..sort((a, b) => a.time.compareTo(b.time));
  }

  @override
  Widget build(BuildContext context) {
    if (widget.items.isEmpty) {
      return const _CalendarEmptyState(
        message: 'No upcoming events or deadlines on record.',
      );
    }

    final selectedDay = _selectedDay ?? DateTime.now();
    final selectedItems = _itemsForDay(selectedDay);

    final calendar = Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: TableCalendar<_CalendarItem>(
          firstDay: DateTime.now().subtract(const Duration(days: 365)),
          lastDay: DateTime.now().add(const Duration(days: 365 * 3)),
          focusedDay: _focusedDay,
          selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
          eventLoader: _itemsForDay,
          startingDayOfWeek: StartingDayOfWeek.sunday,
          headerStyle: const HeaderStyle(
            formatButtonVisible: false,
            titleCentered: true,
          ),
          calendarStyle: CalendarStyle(
            outsideDaysVisible: false,
            selectedDecoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primary,
              shape: BoxShape.circle,
            ),
            todayDecoration: BoxDecoration(
              color: Theme.of(context).colorScheme.secondaryContainer,
              shape: BoxShape.circle,
            ),
            markerDecoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primary,
              shape: BoxShape.circle,
            ),
            markersMaxCount: 3,
            markerSize: 5,
            markersAnchor: 1.15,
          ),
          onDaySelected: (selectedDay, focusedDay) {
            setState(() {
              _selectedDay = selectedDay;
              _focusedDay = focusedDay;
            });
          },
          onPageChanged: (focusedDay) {
            _focusedDay = focusedDay;
          },
        ),
      ),
    );

    final details = _DayDetailsPanel(day: selectedDay, items: selectedItems);

    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= 920;
        if (isWide) {
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(flex: 3, child: calendar),
              const SizedBox(width: 12),
              Expanded(flex: 2, child: details),
            ],
          );
        }

        return Column(
          children: [
            calendar,
            const SizedBox(height: 12),
            Expanded(child: details),
          ],
        );
      },
    );
  }
}

class _DayDetailsPanel extends StatelessWidget {
  const _DayDetailsPanel({required this.day, required this.items});

  final DateTime day;
  final List<_CalendarItem> items;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              DateFormat('EEEE, MMM d').format(day),
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Expanded(
              child: items.isEmpty
                  ? Center(
                      child: Text(
                        'Nothing due on this day.',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    )
                  : ListView.separated(
                      itemCount: items.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final item = items[index];
                        return ListTile(
                          dense: true,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          leading: CircleAvatar(
                            backgroundColor: item.color,
                            radius: 7,
                          ),
                          title: Text(item.title),
                          subtitle: Text(
                            DateFormat('h:mm a').format(item.time),
                          ),
                          trailing: Chip(label: Text(item.tag)),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CalendarSkeleton extends StatelessWidget {
  const _CalendarSkeleton();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const Card(child: SizedBox(height: 380)),
        const SizedBox(height: 12),
        Expanded(
          child: ListView.builder(
            itemCount: 3,
            itemBuilder: (_, _) => const Card(
              margin: EdgeInsets.only(bottom: 12),
              child: SizedBox(height: 72),
            ),
          ),
        ),
      ],
    );
  }
}

class _CalendarEmptyState extends StatelessWidget {
  const _CalendarEmptyState({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final mutedColor = Theme.of(context).textTheme.bodySmall?.color;

    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.event_available_outlined, size: 56, color: mutedColor),
          const SizedBox(height: 12),
          Text(message, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 6),
          Text(
            'Calendar pulls both Canvas events and assignment due dates.',
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
        : const Color(0xFF607D8B);
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
