import json
import time
import os
import sys
from typing import Dict, List, Any
import urllib.request

CONFIG_PATH = os.path.join(os.path.dirname(__file__), 'recruiter_queries.json')
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), 'TEST_RESULTS.md')
ENDPOINT_ENV = os.getenv('DIGITAL_TWIN_MCP_ENDPOINT')


def post_json(url: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = resp.read().decode('utf-8')
        return json.loads(body)


def run_tests():
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        config = json.load(f)

    endpoint = ENDPOINT_ENV or config.get('endpoint')
    if not endpoint:
        print('❌ Endpoint not provided. Set DIGITAL_TWIN_MCP_ENDPOINT or add to recruiter_queries.json')
        sys.exit(1)

    categories = config.get('categories', [])
    results: List[Dict[str, Any]] = []

    total_start = time.monotonic()

    for cat in categories:
        cat_name = cat['name']
        for q in cat['questions']:
            payload = {
                'jsonrpc': '2.0',
                'id': int(time.time() * 1000),
                'method': 'tools/call',
                'params': {
                    'name': 'query_digital_twin',
                    'arguments': {
                        'question': q
                    }
                }
            }

            start = time.monotonic()
            error = None
            answer = ''
            try:
                resp = post_json(endpoint, payload)
                if 'result' in resp and 'content' in resp['result'] and resp['result']['content']:
                    answer = resp['result']['content'][0].get('text', '')
                elif 'error' in resp:
                    error = resp['error'].get('message', 'Unknown error')
                else:
                    error = 'No result content returned'
            except Exception as e:
                error = str(e)
            latency_ms = int((time.monotonic() - start) * 1000)

            results.append({
                'category': cat_name,
                'question': q,
                'latency_ms': latency_ms,
                'ok': error is None,
                'error': error,
                'answer_preview': (answer[:220] + '…') if len(answer) > 220 else answer
            })
            print(f"[{'OK' if error is None else 'ERR'}] {latency_ms}ms | {cat_name}: {q}")

    total_ms = int((time.monotonic() - total_start) * 1000)

    # Aggregate metrics
    latencies = [r['latency_ms'] for r in results]
    oks = [r for r in results if r['ok']]
    errs = [r for r in results if not r['ok']]

    avg_latency = sum(latencies) / len(latencies) if latencies else 0
    p95_latency = sorted(latencies)[int(len(latencies) * 0.95) - 1] if latencies else 0

    # Write report
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as out:
        out.write('# Recruiter Query Test Results\n\n')
        out.write(f'- Endpoint: `{endpoint}`\n')
        out.write(f'- Total questions: {len(results)}\n')
        out.write(f'- Pass: {len(oks)} | Fail: {len(errs)}\n')
        out.write(f'- Avg latency: {avg_latency:.1f} ms | p95 latency: {p95_latency} ms | Total time: {total_ms} ms\n\n')

        out.write('## Detailed Results\n\n')
        out.write('| Status | Latency (ms) | Category | Question | Answer Preview / Error |\n')
        out.write('|---|---:|---|---|---|\n')
        for r in results:
            status = '✅' if r['ok'] else '❌'
            preview = r['answer_preview'] if r['ok'] else f"Error: {r['error']}"
            # Escape pipes in preview
            preview = preview.replace('|', '\\|')
            out.write(f"| {status} | {r['latency_ms']} | {r['category']} | {r['question']} | {preview} |\n")

    print(f"\n📄 Wrote report to {OUTPUT_PATH}")


if __name__ == '__main__':
    run_tests()
