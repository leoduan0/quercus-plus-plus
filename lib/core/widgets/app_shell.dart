import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/controllers/token_controller.dart';
import '../../features/dashboard/controllers/canvas_data_controller.dart';

class AppShell extends ConsumerWidget {
  const AppShell({super.key, required this.state, required this.child});

  final GoRouterState state;
  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentLocation = state.matchedLocation;
    final activeTab = AppTabX.fromLocation(currentLocation);

    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= 1024;
        if (isWide) {
          return Scaffold(
            body: SafeArea(
              child: Row(
                children: [
                  _WideNav(
                    activeTab: activeTab,
                    onSelect: (tab) => _navigate(context, currentLocation, tab),
                    onLogout: () => _handleLogout(context, ref),
                  ),
                  const VerticalDivider(width: 1),
                  Expanded(child: child),
                ],
              ),
            ),
          );
        }

        return Scaffold(
          body: SafeArea(child: child),
          bottomNavigationBar: _BottomNav(
            activeTab: activeTab,
            onSelect: (tab) => _navigate(context, currentLocation, tab),
            onLogout: () => _handleLogout(context, ref),
          ),
        );
      },
    );
  }

  void _navigate(BuildContext context, String currentLocation, AppTab tab) {
    if (currentLocation == tab.path) return;
    context.go(tab.path);
  }

  Future<void> _handleLogout(BuildContext context, WidgetRef ref) async {
    await ref.read(tokenControllerProvider.notifier).clear();
    await ref.read(canvasDataControllerProvider.notifier).clearCache();
    ref.invalidate(canvasDataControllerProvider);
    if (context.mounted) {
      context.go('/');
    }
  }
}

enum AppTab { courses, todo, calendar, assistant }

extension AppTabX on AppTab {
  String get path {
    switch (this) {
      case AppTab.courses:
        return '/courses';
      case AppTab.todo:
        return '/todo';
      case AppTab.calendar:
        return '/calendar';
      case AppTab.assistant:
        return '/assistant';
    }
  }

  String get label {
    switch (this) {
      case AppTab.courses:
        return 'Classes';
      case AppTab.todo:
        return 'To-Do';
      case AppTab.calendar:
        return 'Calendar';
      case AppTab.assistant:
        return 'AI Chat';
    }
  }

  IconData get icon {
    switch (this) {
      case AppTab.courses:
        return Icons.school_outlined;
      case AppTab.todo:
        return Icons.check_circle_outlined;
      case AppTab.calendar:
        return Icons.calendar_month_outlined;
      case AppTab.assistant:
        return Icons.chat_bubble_outline;
    }
  }

  static AppTab fromLocation(String location) {
    return AppTab.values.firstWhere(
      (tab) => location.startsWith(tab.path),
      orElse: () => AppTab.courses,
    );
  }
}

class _WideNav extends StatelessWidget {
  const _WideNav({
    required this.activeTab,
    required this.onSelect,
    required this.onLogout,
  });

  final AppTab activeTab;
  final ValueChanged<AppTab> onSelect;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    return NavigationRail(
      selectedIndex: AppTab.values.indexOf(activeTab),
      labelType: NavigationRailLabelType.all,
      destinations: [
        for (final tab in AppTab.values)
          NavigationRailDestination(
            icon: Icon(tab.icon),
            label: Text(tab.label),
          ),
      ],
      onDestinationSelected: (index) => onSelect(AppTab.values[index]),
      trailing: Padding(
        padding: const EdgeInsets.only(top: 24),
        child: IconButton(
          tooltip: 'Disconnect',
          onPressed: onLogout,
          icon: const Icon(Icons.logout_rounded),
        ),
      ),
    );
  }
}

class _BottomNav extends StatelessWidget {
  const _BottomNav({
    required this.activeTab,
    required this.onSelect,
    required this.onLogout,
  });

  final AppTab activeTab;
  final ValueChanged<AppTab> onSelect;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    return NavigationBar(
      destinations: [
        for (final tab in AppTab.values)
          NavigationDestination(icon: Icon(tab.icon), label: tab.label),
        const NavigationDestination(
          icon: Icon(Icons.logout_outlined),
          label: 'Logout',
        ),
      ],
      selectedIndex: AppTab.values.indexOf(activeTab),
      onDestinationSelected: (index) {
        if (index == AppTab.values.length) {
          onLogout();
        } else {
          onSelect(AppTab.values[index]);
        }
      },
    );
  }
}
