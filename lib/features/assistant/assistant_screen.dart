import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models/assistant_models.dart';
import '../dashboard/widgets/dashboard_header.dart';
import 'controllers/assistant_controller.dart';

class AssistantScreen extends ConsumerStatefulWidget {
  const AssistantScreen({super.key});

  @override
  ConsumerState<AssistantScreen> createState() => _AssistantScreenState();
}

class _AssistantScreenState extends ConsumerState<AssistantScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _submit(String? forcedText) async {
    final text = forcedText ?? _controller.text;
    if (text.trim().isEmpty) return;
    _controller.clear();
    await ref.read(assistantControllerProvider.notifier).sendMessage(text);
    await Future<void>.delayed(const Duration(milliseconds: 150));
    if (mounted && _scrollController.hasClients) {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(assistantControllerProvider);

    return Column(
      children: [
        const DashboardHeader(title: 'AI Assistant'),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
            child: Card(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(32),
              ),
              child: Column(
                children: [
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: state.messages.isEmpty
                          ? _Suggestions(onSuggestion: _submit)
                          : ListView.builder(
                              controller: _scrollController,
                              itemCount: state.messages.length,
                              itemBuilder: (context, index) {
                                final message = state.messages[index];
                                final align = message.role == AssistantRole.user
                                    ? Alignment.centerRight
                                    : Alignment.centerLeft;
                                final bubbleColor =
                                    message.role == AssistantRole.user
                                    ? const Color(0xFF4A4DE6)
                                    : Colors.grey.shade100;
                                final textColor =
                                    message.role == AssistantRole.user
                                    ? Colors.white
                                    : Colors.black87;
                                return Align(
                                  alignment: align,
                                  child: Container(
                                    margin: const EdgeInsets.symmetric(
                                      vertical: 6,
                                    ),
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 14,
                                      vertical: 12,
                                    ),
                                    constraints: const BoxConstraints(
                                      maxWidth: 540,
                                    ),
                                    decoration: BoxDecoration(
                                      color: bubbleColor,
                                      borderRadius: BorderRadius.circular(18),
                                    ),
                                    child: Text(
                                      message.content,
                                      style: TextStyle(color: textColor),
                                    ),
                                  ),
                                );
                              },
                            ),
                    ),
                  ),
                  if (state.error != null)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: Text(
                        state.error!,
                        style: const TextStyle(color: Colors.redAccent),
                      ),
                    ),
                  const Divider(height: 1),
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 24,
                      vertical: 18,
                    ),
                    child: Row(
                      children: [
                        if (state.messages.isNotEmpty)
                          IconButton(
                            tooltip: 'New conversation',
                            icon: const Icon(Icons.add_circle_outline),
                            onPressed: state.isLoading
                                ? null
                                : () => ref
                                      .read(
                                        assistantControllerProvider.notifier,
                                      )
                                      .reset(),
                          ),
                        Expanded(
                          child: TextField(
                            controller: _controller,
                            minLines: 1,
                            maxLines: 6,
                            enabled: !state.isLoading,
                            decoration: const InputDecoration(
                              hintText:
                                  'Ask about assignments, grades, or study plans...',
                            ),
                            onSubmitted: (_) => _submit(null),
                          ),
                        ),
                        const SizedBox(width: 12),
                        FilledButton(
                          onPressed: state.isLoading
                              ? null
                              : () => _submit(null),
                          child: Text(state.isLoading ? 'Thinking...' : 'Send'),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _Suggestions extends StatelessWidget {
  const _Suggestions({required this.onSuggestion});

  final Future<void> Function(String) onSuggestion;

  @override
  Widget build(BuildContext context) {
    const prompts = [
      'What assignments do I have this week?',
      'Summarize this week\'s announcements.',
      'How am I doing in CSC148?',
      'I need a study plan for MAT137.',
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Ask about anything tied to your Canvas data. The assistant knows assignments, submissions, announcements, and syllabus weights.',
          style: Theme.of(
            context,
          ).textTheme.bodyLarge?.copyWith(color: Colors.black87),
        ),
        const SizedBox(height: 18),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final prompt in prompts)
              OutlinedButton(
                onPressed: () => onSuggestion(prompt),
                child: Text(prompt),
              ),
          ],
        ),
      ],
    );
  }
}
