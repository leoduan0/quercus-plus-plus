import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/assistant/assistant_screen.dart';
import '../../features/auth/token_entry_screen.dart';
import '../../features/calendar/calendar_screen.dart';
import '../../features/courses/courses_screen.dart';
import '../../features/todo/todo_screen.dart';
import '../../features/auth/controllers/token_controller.dart';
import '../../features/dashboard/controllers/canvas_data_controller.dart';
import '../widgets/app_shell.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final notifier = RouterNotifier(ref);
  ref.onDispose(notifier.dispose);

  return GoRouter(
    initialLocation: '/courses',
    debugLogDiagnostics: false,
    refreshListenable: notifier,
    redirect: notifier.redirect,
    routes: [
      GoRoute(
        path: '/',
        name: 'token',
        builder: (context, state) => const TokenEntryScreen(),
      ),
      ShellRoute(
        builder: (context, state, child) =>
            AppShell(state: state, child: child),
        routes: [
          GoRoute(
            path: '/courses',
            name: 'courses',
            builder: (context, state) => const CoursesScreen(),
          ),
          GoRoute(
            path: '/todo',
            name: 'todo',
            builder: (context, state) => const TodoScreen(),
          ),
          GoRoute(
            path: '/calendar',
            name: 'calendar',
            builder: (context, state) => const CalendarScreen(),
          ),
          GoRoute(
            path: '/assistant',
            name: 'assistant',
            builder: (context, state) => const AssistantScreen(),
          ),
        ],
      ),
    ],
  );
});

class RouterNotifier extends ChangeNotifier {
  RouterNotifier(this.ref) {
    _sub = ref.listen<AsyncValue<String?>>(tokenControllerProvider, (
      previous,
      next,
    ) {
      notifyListeners();
    });
    _dataSub = ref.listen<AsyncValue<CanvasDataState>>(
      canvasDataControllerProvider,
      (previous, next) {
        if (next.hasError && next.value == null) {
          notifyListeners();
        }
      },
    );
  }

  final Ref ref;
  ProviderSubscription<AsyncValue<String?>>? _sub;
  ProviderSubscription<AsyncValue<CanvasDataState>>? _dataSub;

  String? redirect(BuildContext context, GoRouterState state) {
    final token = ref.read(tokenControllerProvider).valueOrNull;
    final loggingIn = state.matchedLocation == '/';

    if (token == null) {
      return loggingIn ? null : '/';
    }

    if (loggingIn) {
      return '/courses';
    }

    return null;
  }

  @override
  void dispose() {
    _sub?.close();
    _dataSub?.close();
    super.dispose();
  }
}
