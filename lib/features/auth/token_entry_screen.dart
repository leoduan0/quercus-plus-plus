import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/providers.dart';
import '../dashboard/controllers/canvas_data_controller.dart';
import 'controllers/token_controller.dart';

class TokenEntryScreen extends ConsumerStatefulWidget {
  const TokenEntryScreen({super.key});

  @override
  ConsumerState<TokenEntryScreen> createState() => _TokenEntryScreenState();
}

class _TokenEntryScreenState extends ConsumerState<TokenEntryScreen> {
  final _formKey = GlobalKey<FormState>();
  final _tokenController = TextEditingController();
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _tokenController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;
    final token = _tokenController.text.trim();
    if (token.isEmpty) return;

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final repo = ref.read(canvasRepositoryProvider);
      await repo.validateToken(token);
      await ref.read(tokenControllerProvider.notifier).persist(token);
      await ref.read(canvasDataControllerProvider.notifier).clearCache();
      ref.invalidate(canvasDataControllerProvider);
      if (!mounted) return;
      context.go('/courses');
    } catch (error) {
      setState(() {
        _error = 'Validation failed: ${error.toString()}';
      });
    } finally {
      if (mounted) {
        setState(() {
          _submitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF131E3A), Color(0xFF2C3562), Color(0xFF4E2E8C)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: Card(
              elevation: 0,
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Quercus++',
                        style: TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Connect your Quercus account to unlock class dashboards, TODO triage, a contextual calendar, and our AI assistant.',
                        style: Theme.of(
                          context,
                        ).textTheme.bodyMedium?.copyWith(color: Colors.black87),
                      ),
                      const SizedBox(height: 24),
                      TextFormField(
                        controller: _tokenController,
                        enabled: !_submitting,
                        decoration: const InputDecoration(
                          labelText: 'Canvas API token',
                          hintText: 'Paste the token you generated in Quercus',
                        ),
                        obscureText: true,
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'Token is required';
                          }
                          if (value.trim().length < 10) {
                            return 'That token looks too short';
                          }
                          return null;
                        },
                      ),
                      if (_error != null) ...[
                        const SizedBox(height: 12),
                        Text(
                          _error!,
                          style: const TextStyle(color: Colors.redAccent),
                        ),
                      ],
                      const SizedBox(height: 24),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton.icon(
                          onPressed: _submitting ? null : _handleSubmit,
                          icon: _submitting
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Icon(Icons.lock_open_rounded),
                          label: Text(
                            _submitting ? 'Verifying...' : 'Connect to Quercus',
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      const _TokenHelpAccordion(),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _TokenHelpAccordion extends StatefulWidget {
  const _TokenHelpAccordion();

  @override
  State<_TokenHelpAccordion> createState() => _TokenHelpAccordionState();
}

class _TokenHelpAccordionState extends State<_TokenHelpAccordion> {
  final List<bool> _expanded = [true, false];

  void _toggle(int index) {
    setState(() => _expanded[index] = !_expanded[index]);
  }

  @override
  Widget build(BuildContext context) {
    return ExpansionPanelList(
      elevation: 0,
      expandedHeaderPadding: EdgeInsets.zero,
      expansionCallback: (index, isExpanded) {
        setState(() => _expanded[index] = !isExpanded);
      },
      children: [
        ExpansionPanel(
          canTapOnHeader: true,
          isExpanded: _expanded[0],
          headerBuilder: (_, __) => ListTile(
            onTap: () => _toggle(0),
            title: const Text('How do I generate a Canvas token?'),
          ),
          body: const Padding(
            padding: EdgeInsets.only(bottom: 12, left: 16, right: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _StepText('1. Visit Quercus → Account → Settings'),
                _StepText(
                  '2. Scroll to Approved Integrations and click “+ New Access Token”',
                ),
                _StepText('3. Name it “Quercus++” and generate the token'),
                _StepText('4. Paste the token above and submit'),
              ],
            ),
          ),
        ),
        ExpansionPanel(
          canTapOnHeader: true,
          isExpanded: _expanded[1],
          headerBuilder: (_, __) => ListTile(
            onTap: () => _toggle(1),
            title: const Text('Where is my data stored?'),
          ),
          body: const Padding(
            padding: EdgeInsets.only(bottom: 12, left: 16, right: 16),
            child: Text(
              'Everything stays on-device. We cache your token and Canvas payload locally so you can refresh instantly without reinserting credentials.',
            ),
          ),
        ),
      ],
    );
  }
}

class _StepText extends StatelessWidget {
  const _StepText(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Text(text, style: Theme.of(context).textTheme.bodyMedium),
    );
  }
}
