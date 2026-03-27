class CanvasAssignment {
  CanvasAssignment({
    required this.id,
    required this.name,
    this.dueAt,
    this.pointsPossible,
    this.submissionTypes = const [],
    this.description,
    this.score,
    this.grade,
    this.submittedAt,
    this.workflowState,
  });

  final String id;
  final String name;
  final DateTime? dueAt;
  final double? pointsPossible;
  final List<String> submissionTypes;
  final String? description;
  final double? score;
  final String? grade;
  final DateTime? submittedAt;
  final String? workflowState;

  factory CanvasAssignment.fromJson(Map<String, dynamic> json) {
    return CanvasAssignment(
      id: json['id'].toString(),
      name: json['name'] ?? 'Untitled assignment',
      dueAt: _parseDate(json['dueAt']),
      pointsPossible: (json['pointsPossible'] as num?)?.toDouble(),
      submissionTypes:
          (json['submissionTypes'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
      description: json['description'] as String?,
      score: (json['score'] as num?)?.toDouble(),
      grade: json['grade'] as String?,
      submittedAt: _parseDate(json['submittedAt']),
      workflowState: json['workflowState'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'dueAt': dueAt?.toIso8601String(),
      'pointsPossible': pointsPossible,
      'submissionTypes': submissionTypes,
      'description': description,
      'score': score,
      'grade': grade,
      'submittedAt': submittedAt?.toIso8601String(),
      'workflowState': workflowState,
    };
  }
}

class CanvasGrade {
  CanvasGrade({
    this.currentScore,
    this.currentGrade,
    this.finalScore,
    this.finalGrade,
  });

  final double? currentScore;
  final String? currentGrade;
  final double? finalScore;
  final String? finalGrade;

  factory CanvasGrade.fromJson(Map<String, dynamic> json) {
    return CanvasGrade(
      currentScore: (json['currentScore'] as num?)?.toDouble(),
      currentGrade: json['currentGrade'] as String?,
      finalScore: (json['finalScore'] as num?)?.toDouble(),
      finalGrade: json['finalGrade'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'currentScore': currentScore,
      'currentGrade': currentGrade,
      'finalScore': finalScore,
      'finalGrade': finalGrade,
    };
  }
}

class SubmissionComment {
  SubmissionComment({this.author, this.comment, this.createdAt});

  final String? author;
  final String? comment;
  final DateTime? createdAt;

  factory SubmissionComment.fromJson(Map<String, dynamic> json) {
    return SubmissionComment(
      author: json['author'] as String?,
      comment: json['comment'] as String?,
      createdAt: _parseDate(json['createdAt']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'author': author,
      'comment': comment,
      'createdAt': createdAt?.toIso8601String(),
    };
  }
}

class CanvasSubmission {
  CanvasSubmission({
    required this.assignmentId,
    this.assignmentName,
    this.score,
    this.grade,
    this.submittedAt,
    this.gradedAt,
    this.pointsPossible,
    this.late,
    this.missing,
    this.comments = const [],
  });

  final String assignmentId;
  final String? assignmentName;
  final double? score;
  final String? grade;
  final DateTime? submittedAt;
  final DateTime? gradedAt;
  final double? pointsPossible;
  final bool? late;
  final bool? missing;
  final List<SubmissionComment> comments;

  factory CanvasSubmission.fromJson(Map<String, dynamic> json) {
    return CanvasSubmission(
      assignmentId: json['assignmentId'].toString(),
      assignmentName: json['assignmentName'] as String?,
      score: (json['score'] as num?)?.toDouble(),
      grade: json['grade'] as String?,
      submittedAt: _parseDate(json['submittedAt']),
      gradedAt: _parseDate(json['gradedAt']),
      pointsPossible: (json['pointsPossible'] as num?)?.toDouble(),
      late: json['late'] as bool?,
      missing: json['missing'] as bool?,
      comments:
          (json['comments'] as List<dynamic>?)
              ?.map(
                (e) => SubmissionComment.fromJson(
                  Map<String, dynamic>.from(e as Map),
                ),
              )
              .toList() ??
          const [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'assignmentId': assignmentId,
      'assignmentName': assignmentName,
      'score': score,
      'grade': grade,
      'submittedAt': submittedAt?.toIso8601String(),
      'gradedAt': gradedAt?.toIso8601String(),
      'pointsPossible': pointsPossible,
      'late': late,
      'missing': missing,
      'comments': comments.map((c) => c.toJson()).toList(),
    };
  }
}

class CanvasFile {
  CanvasFile({
    required this.id,
    required this.name,
    this.size,
    this.contentType,
    this.url,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String name;
  final int? size;
  final String? contentType;
  final String? url;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  factory CanvasFile.fromJson(Map<String, dynamic> json) {
    return CanvasFile(
      id: json['id'].toString(),
      name: json['name'] ?? 'File',
      size: json['size'] as int?,
      contentType: json['contentType'] as String?,
      url: json['url'] as String?,
      createdAt: _parseDate(json['createdAt']),
      updatedAt: _parseDate(json['updatedAt']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'size': size,
      'contentType': contentType,
      'url': url,
      'createdAt': createdAt?.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }
}

class CanvasModuleItem {
  CanvasModuleItem({
    required this.id,
    required this.title,
    this.type,
    this.url,
  });

  final String id;
  final String title;
  final String? type;
  final String? url;

  factory CanvasModuleItem.fromJson(Map<String, dynamic> json) {
    return CanvasModuleItem(
      id: json['id'].toString(),
      title: json['title'] ?? 'Item',
      type: json['type'] as String?,
      url: json['url'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {'id': id, 'title': title, 'type': type, 'url': url};
  }
}

class CanvasModule {
  CanvasModule({
    required this.id,
    required this.name,
    this.position,
    this.state,
    this.itemCount,
    this.items = const [],
  });

  final String id;
  final String name;
  final int? position;
  final String? state;
  final int? itemCount;
  final List<CanvasModuleItem> items;

  factory CanvasModule.fromJson(Map<String, dynamic> json) {
    return CanvasModule(
      id: json['id'].toString(),
      name: json['name'] ?? 'Module',
      position: json['position'] as int?,
      state: json['state'] as String?,
      itemCount: json['itemCount'] as int?,
      items:
          (json['items'] as List<dynamic>?)
              ?.map(
                (e) => CanvasModuleItem.fromJson(
                  Map<String, dynamic>.from(e as Map),
                ),
              )
              .toList() ??
          const [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'position': position,
      'state': state,
      'itemCount': itemCount,
      'items': items.map((i) => i.toJson()).toList(),
    };
  }
}

class CanvasAnnouncement {
  CanvasAnnouncement({
    required this.id,
    required this.title,
    this.postedAt,
    this.message,
  });

  final String id;
  final String title;
  final DateTime? postedAt;
  final String? message;

  factory CanvasAnnouncement.fromJson(Map<String, dynamic> json) {
    return CanvasAnnouncement(
      id: json['id'].toString(),
      title: json['title'] ?? 'Announcement',
      postedAt: _parseDate(json['postedAt']),
      message: json['message'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'postedAt': postedAt?.toIso8601String(),
      'message': message,
    };
  }
}

class CanvasCourse {
  CanvasCourse({
    required this.id,
    required this.name,
    this.code,
    this.term,
    this.startAt,
    this.endAt,
    this.grades,
    this.assignments = const [],
    this.submissions = const [],
    this.syllabusBody,
    this.syllabusFiles = const [],
    this.modules = const [],
    this.announcements = const [],
    this.files = const [],
    this.syllabusSummary,
    this.syllabusWeights = const [],
  });

  final String id;
  final String name;
  final String? code;
  final int? term;
  final DateTime? startAt;
  final DateTime? endAt;
  final CanvasGrade? grades;
  final List<CanvasAssignment> assignments;
  final List<CanvasSubmission> submissions;
  final String? syllabusBody;
  final List<CanvasFile> syllabusFiles;
  final List<CanvasModule> modules;
  final List<CanvasAnnouncement> announcements;
  final List<CanvasFile> files;
  final String? syllabusSummary;
  final List<SyllabusWeight> syllabusWeights;

  factory CanvasCourse.fromJson(Map<String, dynamic> json) {
    return CanvasCourse(
      id: json['id'].toString(),
      name: json['name'] ?? 'Course',
      code: json['code'] as String?,
      term: json['term'] as int?,
      startAt: _parseDate(json['startAt']),
      endAt: _parseDate(json['endAt']),
      grades: json['grades'] != null
          ? CanvasGrade.fromJson(
              Map<String, dynamic>.from(json['grades'] as Map),
            )
          : null,
      assignments:
          (json['assignments'] as List<dynamic>?)
              ?.map(
                (e) => CanvasAssignment.fromJson(
                  Map<String, dynamic>.from(e as Map),
                ),
              )
              .toList() ??
          const [],
      submissions:
          (json['submissions'] as List<dynamic>?)
              ?.map(
                (e) => CanvasSubmission.fromJson(
                  Map<String, dynamic>.from(e as Map),
                ),
              )
              .toList() ??
          const [],
      syllabusBody: json['syllabusBody'] as String?,
      syllabusFiles:
          (json['syllabusFiles'] as List<dynamic>?)
              ?.map(
                (e) => CanvasFile.fromJson(Map<String, dynamic>.from(e as Map)),
              )
              .toList() ??
          const [],
      modules:
          (json['modules'] as List<dynamic>?)
              ?.map(
                (e) =>
                    CanvasModule.fromJson(Map<String, dynamic>.from(e as Map)),
              )
              .toList() ??
          const [],
      announcements:
          (json['announcements'] as List<dynamic>?)
              ?.map(
                (e) => CanvasAnnouncement.fromJson(
                  Map<String, dynamic>.from(e as Map),
                ),
              )
              .toList() ??
          const [],
      files:
          (json['files'] as List<dynamic>?)
              ?.map(
                (e) => CanvasFile.fromJson(Map<String, dynamic>.from(e as Map)),
              )
              .toList() ??
          const [],
      syllabusSummary: json['syllabusSummary'] as String?,
      syllabusWeights:
          (json['syllabusWeights'] as List<dynamic>?)
              ?.map(
                (e) => SyllabusWeight.fromJson(
                  Map<String, dynamic>.from(e as Map),
                ),
              )
              .toList() ??
          const [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'code': code,
      'term': term,
      'startAt': startAt?.toIso8601String(),
      'endAt': endAt?.toIso8601String(),
      'grades': grades?.toJson(),
      'assignments': assignments.map((a) => a.toJson()).toList(),
      'submissions': submissions.map((s) => s.toJson()).toList(),
      'syllabusBody': syllabusBody,
      'syllabusFiles': syllabusFiles.map((f) => f.toJson()).toList(),
      'modules': modules.map((m) => m.toJson()).toList(),
      'announcements': announcements.map((a) => a.toJson()).toList(),
      'files': files.map((f) => f.toJson()).toList(),
      'syllabusSummary': syllabusSummary,
      'syllabusWeights': syllabusWeights.map((w) => w.toJson()).toList(),
    };
  }
}

class CanvasUpcomingEvent {
  CanvasUpcomingEvent({
    this.id,
    required this.title,
    this.startAt,
    this.endAt,
    this.type,
    this.contextCode,
    this.contextName,
    this.locationName,
  });

  final String? id;
  final String title;
  final DateTime? startAt;
  final DateTime? endAt;
  final String? type;
  final String? contextCode;
  final String? contextName;
  final String? locationName;

  factory CanvasUpcomingEvent.fromJson(Map<String, dynamic> json) {
    return CanvasUpcomingEvent(
      id: json['id']?.toString(),
      title: json['title'] ?? 'Event',
      startAt: _parseDate(json['start_at'] ?? json['startAt']),
      endAt: _parseDate(json['end_at'] ?? json['endAt']),
      type: json['type'] as String?,
      contextCode:
          json['context_code'] as String? ?? json['contextCode'] as String?,
      contextName:
          json['context_name'] as String? ?? json['contextName'] as String?,
      locationName:
          json['location_name'] as String? ?? json['locationName'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'startAt': startAt?.toIso8601String(),
      'endAt': endAt?.toIso8601String(),
      'type': type,
      'contextCode': contextCode,
      'contextName': contextName,
      'locationName': locationName,
    };
  }
}

class CanvasTodoItem {
  CanvasTodoItem({this.id, this.courseId, this.contextName, this.assignment});

  final String? id;
  final String? courseId;
  final String? contextName;
  final TodoAssignment? assignment;

  factory CanvasTodoItem.fromJson(Map<String, dynamic> json) {
    return CanvasTodoItem(
      id: json['id']?.toString(),
      courseId: json['course_id']?.toString() ?? json['courseId']?.toString(),
      contextName:
          json['context_name'] as String? ?? json['contextName'] as String?,
      assignment: json['assignment'] != null
          ? TodoAssignment.fromJson(
              Map<String, dynamic>.from(json['assignment'] as Map),
            )
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'courseId': courseId,
      'contextName': contextName,
      'assignment': assignment?.toJson(),
    };
  }
}

class TodoAssignment {
  TodoAssignment({this.name, this.dueAt});

  final String? name;
  final DateTime? dueAt;

  factory TodoAssignment.fromJson(Map<String, dynamic> json) {
    return TodoAssignment(
      name: json['name'] as String?,
      dueAt: _parseDate(json['due_at'] ?? json['dueAt']),
    );
  }

  Map<String, dynamic> toJson() {
    return {'name': name, 'dueAt': dueAt?.toIso8601String()};
  }
}

class CanvasData {
  CanvasData({
    required this.fetchedAt,
    required this.courses,
    required this.upcoming,
    required this.todo,
  });

  final DateTime fetchedAt;
  final List<CanvasCourse> courses;
  final List<CanvasUpcomingEvent> upcoming;
  final List<CanvasTodoItem> todo;

  factory CanvasData.fromJson(Map<String, dynamic> json) {
    return CanvasData(
      fetchedAt: _parseDate(json['fetchedAt']) ?? DateTime.now(),
      courses:
          (json['courses'] as List<dynamic>?)
              ?.map(
                (e) =>
                    CanvasCourse.fromJson(Map<String, dynamic>.from(e as Map)),
              )
              .toList() ??
          const [],
      upcoming:
          (json['upcoming'] as List<dynamic>?)
              ?.map(
                (e) => CanvasUpcomingEvent.fromJson(
                  Map<String, dynamic>.from(e as Map),
                ),
              )
              .toList() ??
          const [],
      todo:
          (json['todo'] as List<dynamic>?)
              ?.map(
                (e) => CanvasTodoItem.fromJson(
                  Map<String, dynamic>.from(e as Map),
                ),
              )
              .toList() ??
          const [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'fetchedAt': fetchedAt.toIso8601String(),
      'courses': courses.map((c) => c.toJson()).toList(),
      'upcoming': upcoming.map((e) => e.toJson()).toList(),
      'todo': todo.map((t) => t.toJson()).toList(),
    };
  }
}

class SyllabusWeight {
  SyllabusWeight({required this.category, required this.weight});

  final String category;
  final double weight;

  factory SyllabusWeight.fromJson(Map<String, dynamic> json) {
    return SyllabusWeight(
      category: json['category'] ?? 'Component',
      weight: (json['weight'] as num?)?.toDouble() ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {'category': category, 'weight': weight};
  }
}

DateTime? _parseDate(dynamic raw) {
  if (raw == null) return null;
  if (raw is DateTime) return raw;
  return DateTime.tryParse(raw.toString());
}
