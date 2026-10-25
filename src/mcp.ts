import { convertUrl, type Env } from './service';

const VERSION = '2025-06-18';
const TOOL = {
  name: 'read_url',
  description: 'Fetch a public webpage as clean Markdown with optional image analysis.',
  inputSchema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'Public HTTP(S) URL' },
      analyze_images: { type: 'boolean' },
      max_images: { type: 'integer', minimum: 0, maximum: 3 },
    },
    required: ['url'], additionalProperties: false,
  },
};

type Rpc = { jsonrpc?: string; id?: string | number | null; method?: string; params?: unknown };

export async function handleMcp(request: Request, env: Env): Promise<Response> {
  const headers = { 'Content-Type': 'application/json', 'MCP-Protocol-Version': VERSION };
  if (request.method === 'GET') return new Response(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Use POST for JSON-RPC' } }), { status: 405, headers });
  if (request.method !== 'POST') return new Response(null, { status: 405, headers });
  let call: Rpc;
  try { call = await request.json() as Rpc; }
  catch { return Response.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, { status: 400, headers }); }
  if (!call || call.jsonrpc !== '2.0' || typeof call.method !== 'string' || (call.id !== undefined && typeof call.id !== 'string' && typeof call.id !== 'number')) {
    return Response.json({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid Request' } }, { status: 400, headers });
  }
  if (call.method === 'notifications/initialized') return new Response(null, { status: 202, headers });
  const id = call.id ?? null;
  if (id === null) return new Response(null, { status: 202, headers });
  let result: unknown;
  let error: { code: number; message: string } | undefined;
  switch (call.method) {
    case 'initialize': {
      const params = call.params as { protocolVersion?: unknown } | undefined;
      result = { protocolVersion: typeof params?.protocolVersion === 'string' && ['2025-03-26', VERSION].includes(params.protocolVersion) ? params.protocolVersion : VERSION, capabilities: { tools: {} }, serverInfo: { name: 'decruftmd', version: '0.1.0' } };
      break;
    }
    case 'ping': result = {}; break;
    case 'tools/list': result = { tools: [TOOL] }; break;
    case 'tools/call': {
      const params = call.params as { name?: unknown; arguments?: Record<string, unknown> } | undefined;
      if (params?.name !== 'read_url') { error = { code: -32602, message: 'Unknown tool' }; break; }
      const args = params.arguments;
      if (!args || typeof args.url !== 'string' || (args.analyze_images !== undefined && typeof args.analyze_images !== 'boolean') || (args.max_images !== undefined && (!Number.isInteger(args.max_images) || Number(args.max_images) < 0 || Number(args.max_images) > 3))) {
        error = { code: -32602, message: 'Invalid tool arguments' }; break;
      }
      try {
        const converted = await convertUrl(args.url, env, args.analyze_images === true, args.max_images as number | undefined);
        result = { content: [{ type: 'text', text: converted.markdown }] };
      } catch (cause) {
        result = { content: [{ type: 'text', text: cause instanceof Error ? cause.message : 'Conversion failed' }], isError: true };
      }
      break;
    }
    default: error = { code: -32601, message: 'Method not found' };
  }
  return Response.json(error ? { jsonrpc: '2.0', id, error } : { jsonrpc: '2.0', id, result }, { headers });
}
