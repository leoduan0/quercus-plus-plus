import 'package:dio/dio.dart';

class CanvasApiClient {
  CanvasApiClient(this._dio, {required this.baseUrl});

  final Dio _dio;
  final String baseUrl;

  Future<dynamic> get(
    String path, {
    required String token,
    Map<String, dynamic>? query,
  }) async {
    final uri = _buildUri(path, query);
    final response = await _request(
      () => _dio.getUri(uri, options: Options(headers: _headers(token))),
    );
    return response.data;
  }

  Future<List<dynamic>> getAll(
    String path, {
    required String token,
    Map<String, dynamic>? query,
  }) async {
    final results = <dynamic>[];
    Uri? nextUri = _buildUri(path, query);

    while (nextUri != null) {
      final response = await _request(
        () => _dio.getUri(nextUri!, options: Options(headers: _headers(token))),
      );
      final data = response.data;
      if (data is List) {
        results.addAll(data);
      } else if (data != null) {
        results.add(data);
      }
      nextUri = _parseNextLink(response.headers);
    }

    return results;
  }

  Map<String, String> _headers(String token) => {
    'Authorization': 'Bearer $token',
  };

  Uri _buildUri(String path, Map<String, dynamic>? query) {
    final normalizedPath = path.startsWith('/') ? path : '/$path';
    final uri = Uri.parse(baseUrl);
    final mergedPath = (uri.path.endsWith('/'))
        ? '${uri.path.substring(0, uri.path.length - 1)}$normalizedPath'
        : '${uri.path}$normalizedPath';

    String? queryString;
    if (query != null && query.isNotEmpty) {
      final entries = <MapEntry<String, String>>[];
      query.forEach((key, value) {
        if (value is Iterable) {
          entries.addAll(value.map((item) => MapEntry(key, item.toString())));
        } else {
          entries.add(MapEntry(key, value.toString()));
        }
      });
      entries.sort((a, b) {
        final keyCompare = a.key.compareTo(b.key);
        if (keyCompare != 0) return keyCompare;
        return a.value.compareTo(b.value);
      });
      queryString = entries
          .map(
            (entry) =>
                '${Uri.encodeQueryComponent(entry.key)}=${Uri.encodeQueryComponent(entry.value)}',
          )
          .join('&');
    }

    return Uri(
      scheme: uri.scheme,
      host: uri.host,
      port: uri.hasPort ? uri.port : null,
      path: mergedPath,
      query: queryString,
    );
  }

  Uri? _parseNextLink(Headers headers) {
    final links = headers.map['link'];
    final link = (links != null && links.isNotEmpty) ? links.first : null;
    if (link == null) return null;
    final match = RegExp(r'<([^>]+)>;\s*rel="next"').firstMatch(link);
    if (match == null) return null;
    return Uri.tryParse(match.group(1)!);
  }

  Future<Response<dynamic>> _request(
    Future<Response<dynamic>> Function() run,
  ) async {
    try {
      return await run();
    } on DioException catch (error) {
      final status = error.response?.statusCode;
      final message = error.response?.data?.toString() ?? error.message;
      throw CanvasApiException(
        'Canvas API error${status != null ? ' ($status)' : ''}: $message',
      );
    }
  }
}

class CanvasApiException implements Exception {
  CanvasApiException(this.message);
  final String message;

  @override
  String toString() => message;
}
