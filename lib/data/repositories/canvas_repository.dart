import 'dart:async';

import '../models/canvas_models.dart';
import '../services/canvas_api_client.dart';

class CanvasRepository {
  CanvasRepository(this._client);

  final CanvasApiClient _client;

  Future<void> validateToken(String token) async {
    await _client.get('/users/self/profile', token: token);
  }

  Future<CanvasData> fetchAllData({
    required String token,
    void Function(String message)? onProgress,
  }) async {
    onProgress?.call('Fetching active courses...');
    final coursesRaw = await _client.getAll(
      '/courses',
      token: token,
      query: {'enrollment_state': 'active', 'per_page': '100'},
    );

    final upcomingFuture = _safe(
      () => _client.getAll(
        '/users/self/upcoming_events',
        token: token,
        query: {'per_page': '50'},
      ),
    );
    final todoFuture = _safe(
      () => _client.getAll(
        '/users/self/todo',
        token: token,
        query: {'per_page': '50'},
      ),
    );

    final courses = <CanvasCourse>[];
    var index = 0;
    for (final course in coursesRaw) {
      index += 1;
      final readableName = course['name'] ?? 'Course';
      onProgress?.call(
        'Processing $readableName ($index/${coursesRaw.length})',
      );
      courses.add(
        await _hydrateCourse(
          course: Map<String, dynamic>.from(course as Map),
          token: token,
        ),
      );
    }

    final upcoming = (await upcomingFuture)
        .map(
          (e) =>
              CanvasUpcomingEvent.fromJson(Map<String, dynamic>.from(e as Map)),
        )
        .toList();
    final todo = (await todoFuture)
        .map(
          (e) => CanvasTodoItem.fromJson(Map<String, dynamic>.from(e as Map)),
        )
        .toList();

    return CanvasData(
      fetchedAt: DateTime.now(),
      courses: courses,
      upcoming: upcoming,
      todo: todo,
    );
  }

  Future<CanvasCourse> _hydrateCourse({
    required Map<String, dynamic> course,
    required String token,
  }) async {
    final id = course['id'];

    final gradesFuture = _safe(
      () => _client.getAll(
        '/courses/$id/enrollments',
        token: token,
        query: {'type[]': 'StudentEnrollment', 'user_id': 'self'},
      ),
    );

    final assignmentsFuture = _safe(
      () => _client.getAll(
        '/courses/$id/assignments',
        token: token,
        query: {
          'per_page': '100',
          'order_by': 'due_at',
          'include[]': ['submission'],
        },
      ),
    );

    final submissionsFuture = _safe(
      () => _client.getAll(
        '/courses/$id/students/submissions',
        token: token,
        query: {
          'student_ids[]': 'self',
          'per_page': '100',
          'include[]': ['assignment', 'submission_comments'],
        },
      ),
    );

    final modulesFuture = _safe(
      () => _client.getAll(
        '/courses/$id/modules',
        token: token,
        query: {
          'include[]': ['items'],
          'per_page': '100',
        },
      ),
    );

    final announcementsFuture = _safe(
      () => _client.getAll(
        '/courses/$id/discussion_topics',
        token: token,
        query: {'only_announcements': 'true', 'per_page': '50'},
      ),
    );

    final filesFuture = _safe(
      () => _client.getAll(
        '/courses/$id/files',
        token: token,
        query: {'per_page': '100'},
      ),
    );

    final syllabusFuture = _client
        .get(
          '/courses/$id',
          token: token,
          query: {'include[]': 'syllabus_body'},
        )
        .then((value) => Map<String, dynamic>.from(value as Map))
        .catchError((_) => <String, dynamic>{});

    final results = await Future.wait([
      gradesFuture,
      assignmentsFuture,
      submissionsFuture,
      modulesFuture,
      announcementsFuture,
      filesFuture,
      syllabusFuture,
    ]);

    final rawGrades = results[0] as List<dynamic>;
    final rawAssignments = results[1] as List<dynamic>;
    final rawSubmissions = results[2] as List<dynamic>;
    final rawModules = results[3] as List<dynamic>;
    final rawAnnouncements = results[4] as List<dynamic>;
    final rawFiles = results[5] as List<dynamic>;
    final rawSyllabus = results[6] as Map<String, dynamic>;

    CanvasGrade? grades;
    if (rawGrades.isNotEmpty) {
      final gradePayload = rawGrades.first['grades'];
      if (gradePayload is Map) {
        grades = CanvasGrade.fromJson(Map<String, dynamic>.from(gradePayload));
      }
    }

    final assignments = rawAssignments
        .map((item) => _mapAssignment(item as Map<String, dynamic>))
        .toList();
    final submissions = rawSubmissions
        .map((item) => _mapSubmission(item as Map<String, dynamic>))
        .toList();
    final modules = rawModules
        .map((item) => _mapModule(item as Map<String, dynamic>))
        .toList();
    final announcements = rawAnnouncements
        .map((item) => _mapAnnouncement(item as Map<String, dynamic>))
        .toList();
    final files = rawFiles
        .map((item) => _mapFile(item as Map<String, dynamic>))
        .toList();

    final syllabusFiles = files
        .where(
          (file) =>
              (file.name.toLowerCase().contains('syllabus') ||
              file.name.toLowerCase().contains('outline')),
        )
        .toList();

    return CanvasCourse(
      id: id.toString(),
      name: course['name'] ?? 'Course',
      code: course['course_code'] as String?,
      term: course['enrollment_term_id'] as int?,
      startAt: _tryParse(course['start_at']),
      endAt: _tryParse(course['end_at']),
      grades: grades,
      assignments: assignments,
      submissions: submissions,
      syllabusBody: _stripHtml(rawSyllabus['syllabus_body'] as String?),
      syllabusFiles: syllabusFiles,
      modules: modules,
      announcements: announcements,
      files: files,
    );
  }

  CanvasAssignment _mapAssignment(Map<String, dynamic> json) {
    final submission = json['submission'] as Map<String, dynamic>?;
    return CanvasAssignment(
      id: json['id'].toString(),
      name: json['name'] ?? 'Assignment',
      dueAt: _tryParse(json['due_at']),
      pointsPossible: (json['points_possible'] as num?)?.toDouble(),
      submissionTypes:
          (json['submission_types'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
      description: _truncate(_stripHtml(json['description'] as String?)),
      score: (submission?['score'] as num?)?.toDouble(),
      grade: submission?['grade'] as String?,
      submittedAt: _tryParse(submission?['submitted_at']),
      workflowState: submission?['workflow_state'] as String?,
    );
  }

  CanvasSubmission _mapSubmission(Map<String, dynamic> json) {
    final assignment = json['assignment'] as Map<String, dynamic>?;
    final comments =
        (json['submission_comments'] as List<dynamic>?)
            ?.map(
              (c) => SubmissionComment(
                author: (c as Map<String, dynamic>)['author_name'] as String?,
                comment: c['comment'] as String?,
                createdAt: _tryParse(c['created_at']),
              ),
            )
            .toList() ??
        const [];

    return CanvasSubmission(
      assignmentId: json['assignment_id'].toString(),
      assignmentName: assignment?['name'] as String?,
      score: (json['score'] as num?)?.toDouble(),
      grade: json['grade'] as String?,
      submittedAt: _tryParse(json['submitted_at']),
      gradedAt: _tryParse(json['graded_at']),
      pointsPossible: (assignment?['points_possible'] as num?)?.toDouble(),
      late: json['late'] as bool?,
      missing: json['missing'] as bool?,
      comments: comments,
    );
  }

  CanvasModule _mapModule(Map<String, dynamic> json) {
    final items =
        (json['items'] as List<dynamic>?)
            ?.map(
              (item) => CanvasModuleItem(
                id: item['id'].toString(),
                title: item['title'] ?? 'Item',
                type: item['type'] as String?,
                url: item['html_url'] as String?,
              ),
            )
            .toList() ??
        const [];

    return CanvasModule(
      id: json['id'].toString(),
      name: json['name'] ?? 'Module',
      position: json['position'] as int?,
      state: json['state'] as String?,
      itemCount: json['items_count'] as int?,
      items: items,
    );
  }

  CanvasAnnouncement _mapAnnouncement(Map<String, dynamic> json) {
    return CanvasAnnouncement(
      id: json['id'].toString(),
      title: json['title'] ?? 'Announcement',
      postedAt: _tryParse(json['posted_at']),
      message: _truncate(_stripHtml(json['message'] as String?)),
    );
  }

  CanvasFile _mapFile(Map<String, dynamic> json) {
    return CanvasFile(
      id: json['id'].toString(),
      name: (json['display_name'] ?? json['filename'] ?? 'File').toString(),
      size: json['size'] as int?,
      contentType:
          (json['content_type'] ?? json['content-type'] ?? '') as String?,
      url: json['url'] as String?,
      createdAt: _tryParse(json['created_at']),
      updatedAt: _tryParse(json['updated_at']),
    );
  }

  DateTime? _tryParse(dynamic raw) {
    if (raw == null) return null;
    if (raw is DateTime) return raw;
    return DateTime.tryParse(raw.toString());
  }

  String? _stripHtml(String? value) {
    if (value == null) return null;
    return value
        .replaceAll(RegExp(r'<[^>]*>'), ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }

  String? _truncate(String? text, [int max = 500]) {
    if (text == null) return null;
    if (text.length <= max) return text;
    return '${text.substring(0, max)}...';
  }

  Future<List<dynamic>> _safe(Future<List<dynamic>> Function() run) async {
    try {
      return await run();
    } catch (_) {
      return [];
    }
  }
}
