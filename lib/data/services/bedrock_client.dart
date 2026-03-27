import 'dart:convert';
import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:http/http.dart' as http;

import '../../core/config/app_config.dart';

class BedrockClient {
  BedrockClient({http.Client? httpClient})
    : _http = httpClient ?? http.Client(),
      modelId = AppConfig.bedrockModelId,
      region = AppConfig.awsRegion,
      accessKeyId = AppConfig.awsAccessKeyId,
      secretAccessKey = AppConfig.awsSecretAccessKey,
      sessionToken = AppConfig.awsSessionToken;

  final http.Client _http;
  final String modelId;
  final String region;
  final String? accessKeyId;
  final String? secretAccessKey;
  final String? sessionToken;

  String get _host => 'bedrock-runtime.$region.amazonaws.com';
  bool get isNovaModel => modelId.contains('amazon.nova');
  bool get isClaudeModel => modelId.contains('anthropic.claude');

  Future<Map<String, dynamic>> invokeModel(Map<String, dynamic> payload) async {
    if (accessKeyId == null || secretAccessKey == null) {
      throw StateError('Missing AWS credentials.');
    }

    final uri = Uri.https(_host, '/model/$modelId/invoke');
    final body = jsonEncode(payload);
    final payloadHash = sha256.convert(utf8.encode(body)).toString();
    final amzDate = _timestamp();
    final dateStamp = amzDate.substring(0, 8);

    final headers = {
      HttpHeaders.contentTypeHeader: 'application/json',
      HttpHeaders.hostHeader: _host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
    };

    if (sessionToken != null && sessionToken!.isNotEmpty) {
      headers['x-amz-security-token'] = sessionToken!;
    }

    final canonicalRequest = _canonicalRequest(
      method: 'POST',
      uri: uri,
      headers: headers,
      payloadHash: payloadHash,
    );
    final credentialScope = '$dateStamp/$region/bedrock-runtime/aws4_request';
    final stringToSign = _stringToSign(
      amzDate: amzDate,
      credentialScope: credentialScope,
      canonicalRequest: canonicalRequest,
    );
    final signingKey = _signingKey(dateStamp);
    final signature = _hmac(signingKey, stringToSign);

    headers['Authorization'] =
        'AWS4-HMAC-SHA256 Credential=$accessKeyId/$credentialScope, '
        'SignedHeaders=${_signedHeaders(headers)}, Signature=$signature';

    final response = await _http.post(uri, headers: headers, body: body);
    if (response.statusCode >= 400) {
      throw HttpException(
        'Bedrock error ${response.statusCode}: ${response.body}',
        uri: uri,
      );
    }

    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  String _canonicalRequest({
    required String method,
    required Uri uri,
    required Map<String, String> headers,
    required String payloadHash,
  }) {
    final canonicalUri = uri.path.isEmpty ? '/' : uri.path;
    final canonicalQueryString = uri.query.isEmpty
        ? ''
        : (uri.query.split('&')..sort()).join('&');

    final canonicalHeaders =
        headers.entries
            .map((entry) => '${entry.key.toLowerCase()}:${entry.value.trim()}')
            .toList()
          ..sort();
    final signedHeaders = _signedHeaders(headers);

    return [
      method,
      canonicalUri,
      canonicalQueryString,
      ...canonicalHeaders,
      '',
      signedHeaders,
      payloadHash,
    ].join('\n');
  }

  String _stringToSign({
    required String amzDate,
    required String credentialScope,
    required String canonicalRequest,
  }) {
    final canonicalHash = sha256
        .convert(utf8.encode(canonicalRequest))
        .toString();
    return 'AWS4-HMAC-SHA256\n$amzDate\n$credentialScope\n$canonicalHash';
  }

  List<int> _signingKey(String dateStamp) {
    final kDate = _hmacBytes(utf8.encode('AWS4$secretAccessKey'), dateStamp);
    final kRegion = _hmacBytes(kDate, region);
    final kService = _hmacBytes(kRegion, 'bedrock-runtime');
    return _hmacBytes(kService, 'aws4_request');
  }

  String _hmac(List<int> key, String value) {
    final hmacSha256 = Hmac(sha256, key);
    return hmacSha256.convert(utf8.encode(value)).toString();
  }

  List<int> _hmacBytes(List<int> key, String value) {
    final hmacSha256 = Hmac(sha256, key);
    return hmacSha256.convert(utf8.encode(value)).bytes;
  }

  String _signedHeaders(Map<String, String> headers) {
    final keys = headers.keys.map((key) => key.toLowerCase()).toList()..sort();
    return keys.join(';');
  }

  String _timestamp() {
    final now = DateTime.now().toUtc();
    return '${now.year.toString().padLeft(4, '0')}'
        '${now.month.toString().padLeft(2, '0')}'
        '${now.day.toString().padLeft(2, '0')}'
        'T'
        '${now.hour.toString().padLeft(2, '0')}'
        '${now.minute.toString().padLeft(2, '0')}'
        '${now.second.toString().padLeft(2, '0')}Z';
  }
}
