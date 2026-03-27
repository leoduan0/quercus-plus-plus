import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../controllers/canvas_data_controller.dart';

class DashboardHeader extends ConsumerWidget {
  const DashboardHeader({super.key, required this.title});

  final String title;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dataState = ref.watch(canvasDataControllerProvider);
    final controller = ref.read(canvasDataControllerProvider.notifier);
    final fetchedAt = dataState.valueOrNull?.data?.fetchedAt;
    final progress = dataState.valueOrNull?.progressMessage;
    final error = dataState.valueOrNull?.errorMessage;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(
          bottom: BorderSide(color: Colors.black.withOpacity(0.05)),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: Theme.of(context).textTheme.headlineSmall
                          ?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    if (fetchedAt != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(
                          'Updated ${DateFormat.jm().format(fetchedAt)}',
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(color: Colors.black54),
                        ),
                      ),
                    if (progress != null && progress.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(
                          progress,
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(color: Colors.black87),
                        ),
                      ),
                    if (error != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(
                          error,
                          style: const TextStyle(color: Colors.redAccent),
                        ),
                      ),
                  ],
                ),
              ),
              FilledButton.icon(
                onPressed: dataState.isLoading ? null : controller.refresh,
                icon: const Icon(Icons.refresh),
                label: Text(dataState.isLoading ? 'Refreshing' : 'Refresh'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
