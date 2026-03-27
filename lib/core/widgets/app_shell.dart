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
    final currentLocation = state.matchedLocation ?? state.uri.toString();
    final activeTab = AppTabX.fromLocation(currentLocation);

    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= 1024;
        final surface = Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFFF7F8FB), Color(0xFFF0F1F8)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: SafeArea(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (isWide)
                  _Sidebar(
                    activeTab: activeTab,
                    onSelect: (tab) => _navigate(context, currentLocation, tab),
                    onLogout: () => _handleLogout(context, ref),
                  ),
                Expanded(
                  child: Padding(
                    padding: EdgeInsets.symmetric(
                      horizontal: isWide ? 32 : 16,
                      vertical: 24,
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(isWide ? 32 : 24),
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(isWide ? 32 : 24),
                          color: Colors.white,
                          boxShadow: const [
                            BoxShadow(
                              blurRadius: 30,
                              offset: Offset(0, 20),
                              color: Color(0x14000000),
                            ),
                          ],
                        ),
                        child: child,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );

        return Scaffold(
          backgroundColor: Colors.transparent,
          body: surface,
          bottomNavigationBar: isWide
              ? null
              : _BottomNav(
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

class _Sidebar extends StatelessWidget {
  const _Sidebar({
    required this.activeTab,
    required this.onSelect,
    required this.onLogout,
  });

  final AppTab activeTab;
  final ValueChanged<AppTab> onSelect;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 104,
      margin: const EdgeInsets.only(left: 24, top: 24, bottom: 24),
      padding: const EdgeInsets.symmetric(vertical: 24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        boxShadow: const [
          BoxShadow(
            blurRadius: 30,
            offset: Offset(0, 20),
            color: Color(0x14000000),
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: Colors.black.withOpacity(0.08)),
            ),
            child: const Text(
              'Q++',
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
          const SizedBox(height: 32),
          Expanded(
            child: Column(
              children: [
                for (final tab in AppTab.values)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: _SidebarButton(
                      tab: tab,
                      active: tab == activeTab,
                      onTap: () => onSelect(tab),
                    ),
                  ),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Disconnect',
            onPressed: onLogout,
            icon: const Icon(Icons.logout_rounded),
          ),
        ],
      ),
    );
  }
}

class _SidebarButton extends StatelessWidget {
  const _SidebarButton({
    required this.tab,
    required this.active,
    required this.onTap,
  });

  final AppTab tab;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOut,
        width: 64,
        height: 64,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(22),
          color: active ? const Color(0xFFEEF0FF) : Colors.transparent,
          border: Border.all(
            color: active ? const Color(0xFF8288FF) : Colors.transparent,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              tab.icon,
              color: active ? const Color(0xFF4A4DE6) : Colors.black54,
            ),
            const SizedBox(height: 4),
            Text(
              tab.label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: active ? const Color(0xFF4A4DE6) : Colors.black54,
              ),
            ),
          ],
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
