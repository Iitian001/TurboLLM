import { test } from 'node:test'
import assert from 'node:assert/strict'
import { describeToolCall, friendlyName } from './tool-explain'

// Regression: a model emitting `queries: [...]` instead of the schema's `query` used to render
// as the literal string "undefined" in the tool-approval dialog. Mirrors resolveSearchQuery in
// src/tools/builtin.ts so the two can never drift apart.

test('describeToolCall: web_search reads the schema-correct singular query', () => {
  assert.equal(
    describeToolCall('web_search', { query: 'latest stable Node.js version' }),
    'Search the web for "latest stable Node.js version"',
  )
})

test('describeToolCall: web_search falls back to a plural queries array', () => {
  assert.equal(
    describeToolCall('web_search', { queries: ['latest stable Node.js version'] }),
    'Search the web for "latest stable Node.js version"',
  )
})

test('describeToolCall: web_search never renders the literal string "undefined"', () => {
  assert.equal(describeToolCall('web_search', {}), 'Search the web for ""')
})

// MCP names must use the same human-readable formatting as built-in tool names
// in the approval bar, chat tool cards, and tool permissions settings.
test('friendlyName: strips MCP server names and replaces tool underscores with spaces', () => {
  assert.equal(friendlyName('mcp__filesystem__read_file'), 'read file')
  assert.equal(friendlyName('mcp__my_server__list_available_tools'), 'list available tools')
  assert.equal(friendlyName('mcp__filesystem__read'), 'read')
})

test('friendlyName: keeps built-in tool names readable', () => {
  assert.equal(friendlyName('web_search'), 'web search')
})

test('describeToolCall: uses a readable MCP tool name in approval copy', () => {
  assert.equal(
    describeToolCall('mcp__my_server__read_file', {}),
    'Call "read file" on my_server',
  )
})
