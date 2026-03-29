import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/theme_mode_provider.dart';
import '../controllers/canvas_data_controller.dart';

class DashboardHeader extends ConsumerWidget {
  const DashboardHeader({super.key, required this.title});

  final String title;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dataState = ref.watch(canvasDataControllerProvider);
    final controller = ref.read(canvasDataControllerProvider.notifier);
    final themeMode = ref.watch(themeModeProvider);
    final fetchedAt = dataState.valueOrNull?.data?.fetchedAt;
    final progress = dataState.valueOrNull?.progressMessage;
    final error = dataState.valueOrNull?.errorMessage;
    final isDark = themeMode == ThemeMode.dark;
    final mutedColor = Theme.of(context).textTheme.bodySmall?.color;

    return Material(
      elevation: 1,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  if (fetchedAt != null)
                    Text(
                      'Updated ${DateFormat.jm().format(fetchedAt)}',
                      style: Theme.of(
                        context,
                      ).textTheme.bodySmall?.copyWith(color: mutedColor),
                    ),
                  if (progress != null && progress.isNotEmpty)
                    Text(
                      progress,
                      style: Theme.of(
                        context,
                      ).textTheme.bodySmall?.copyWith(color: mutedColor),
                    ),
                  if (error != null)
                    Text(
                      error,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                ],
              ),
            ),
            IconButton(
              tooltip: isDark ? 'Switch to light mode' : 'Switch to dark mode',
              onPressed: () {
                ref.read(themeModeProvider.notifier).state = isDark
                    ? ThemeMode.light
                    : ThemeMode.dark;
              },
              icon: Icon(isDark ? Icons.light_mode : Icons.dark_mode),
            ),
            const SizedBox(width: 8),
            ElevatedButton.icon(
              onPressed: dataState.isLoading ? null : controller.refresh,
              icon: const Icon(Icons.refresh),
              label: Text(dataState.isLoading ? 'Refreshing' : 'Refresh'),
            ),
          ],
        ),
      ),
    );
  }
}
