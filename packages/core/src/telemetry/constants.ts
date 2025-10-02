/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export const SERVICE_NAME = 'alfred-cli';

export const EVENT_USER_PROMPT = 'alfred_cli.user_prompt';
export const EVENT_TOOL_CALL = 'alfred_cli.tool_call';
export const EVENT_API_REQUEST = 'alfred_cli.api_request';
export const EVENT_API_ERROR = 'alfred_cli.api_error';
export const EVENT_API_RESPONSE = 'alfred_cli.api_response';
export const EVENT_CLI_CONFIG = 'alfred_cli.config';
export const EVENT_EXTENSION_DISABLE = 'alfred_cli.extension_disable';
export const EVENT_EXTENSION_ENABLE = 'alfred_cli.extension_enable';
export const EVENT_EXTENSION_INSTALL = 'alfred_cli.extension_install';
export const EVENT_EXTENSION_UNINSTALL = 'alfred_cli.extension_uninstall';
export const EVENT_FLASH_FALLBACK = 'alfred_cli.flash_fallback';
export const EVENT_RIPGREP_FALLBACK = 'alfred_cli.ripgrep_fallback';
export const EVENT_NEXT_SPEAKER_CHECK = 'alfred_cli.next_speaker_check';
export const EVENT_SLASH_COMMAND = 'alfred_cli.slash_command';
export const EVENT_IDE_CONNECTION = 'alfred_cli.ide_connection';
export const EVENT_CONVERSATION_FINISHED = 'alfred_cli.conversation_finished';
export const EVENT_CHAT_COMPRESSION = 'alfred_cli.chat_compression';
export const EVENT_MALFORMED_JSON_RESPONSE =
  'alfred_cli.malformed_json_response';
export const EVENT_INVALID_CHUNK = 'alfred_cli.chat.invalid_chunk';
export const EVENT_CONTENT_RETRY = 'alfred_cli.chat.content_retry';
export const EVENT_CONTENT_RETRY_FAILURE =
  'alfred_cli.chat.content_retry_failure';
export const EVENT_FILE_OPERATION = 'alfred_cli.file_operation';
export const EVENT_MODEL_SLASH_COMMAND = 'alfred_cli.slash_command.model';
export const METRIC_TOOL_CALL_COUNT = 'alfred_cli.tool.call.count';
export const METRIC_TOOL_CALL_LATENCY = 'alfred_cli.tool.call.latency';
export const METRIC_API_REQUEST_COUNT = 'alfred_cli.api.request.count';
export const METRIC_API_REQUEST_LATENCY = 'alfred_cli.api.request.latency';
export const METRIC_TOKEN_USAGE = 'alfred_cli.token.usage';
export const METRIC_SESSION_COUNT = 'alfred_cli.session.count';
export const METRIC_FILE_OPERATION_COUNT = 'alfred_cli.file.operation.count';
export const METRIC_INVALID_CHUNK_COUNT = 'alfred_cli.chat.invalid_chunk.count';
export const METRIC_CONTENT_RETRY_COUNT = 'alfred_cli.chat.content_retry.count';
export const METRIC_CONTENT_RETRY_FAILURE_COUNT =
  'alfred_cli.chat.content_retry_failure.count';
export const EVENT_MODEL_ROUTING = 'alfred_cli.model_routing';
export const METRIC_MODEL_ROUTING_LATENCY = 'alfred_cli.model_routing.latency';
export const METRIC_MODEL_ROUTING_FAILURE_COUNT =
  'alfred_cli.model_routing.failure.count';
export const METRIC_MODEL_SLASH_COMMAND_CALL_COUNT =
  'alfred_cli.slash_command.model.call_count';

// Performance Monitoring Metrics
export const METRIC_STARTUP_TIME = 'alfred_cli.startup.duration';
export const METRIC_MEMORY_USAGE = 'alfred_cli.memory.usage';
export const METRIC_CPU_USAGE = 'alfred_cli.cpu.usage';
export const METRIC_TOOL_QUEUE_DEPTH = 'alfred_cli.tool.queue.depth';
export const METRIC_TOOL_EXECUTION_BREAKDOWN =
  'alfred_cli.tool.execution.breakdown';
export const METRIC_TOKEN_EFFICIENCY = 'alfred_cli.token.efficiency';
export const METRIC_API_REQUEST_BREAKDOWN = 'alfred_cli.api.request.breakdown';
export const METRIC_PERFORMANCE_SCORE = 'alfred_cli.performance.score';
export const METRIC_REGRESSION_DETECTION = 'alfred_cli.performance.regression';
export const METRIC_REGRESSION_PERCENTAGE_CHANGE =
  'alfred_cli.performance.regression.percentage_change';
export const METRIC_BASELINE_COMPARISON =
  'alfred_cli.performance.baseline.comparison';

// Performance Events
export const EVENT_STARTUP_PERFORMANCE = 'alfred_cli.startup.performance';
export const EVENT_MEMORY_USAGE = 'alfred_cli.memory.usage';
export const EVENT_PERFORMANCE_BASELINE = 'alfred_cli.performance.baseline';
export const EVENT_PERFORMANCE_REGRESSION = 'alfred_cli.performance.regression';
