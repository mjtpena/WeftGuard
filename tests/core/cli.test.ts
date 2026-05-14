import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { Writable } from 'stream';
import { describe, expect, it } from 'vitest';
import { runPreflightCli } from '../../src/cli/preflightCli';

class MemoryWritable extends Writable {
  value = '';

  _write(chunk: Buffer | string, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.value += chunk.toString();
    callback();
  }
}

describe('WeftGuard CLI', () => {
  it('runs preflight headlessly and returns a failing exit code for deployment errors', async () => {
    const output = await mkdtemp(join(tmpdir(), 'weftguard-cli-'));
    const stdout = new MemoryWritable();
    const stderr = new MemoryWritable();

    try {
      const result = await runPreflightCli(
        ['preflight', '--project', join(process.cwd(), 'examples', 'demo-fabric-production'), '--out', output, '--fail-on', 'error'],
        stdout,
        stderr
      );

      expect(result.exitCode).toBe(1);
      expect(result.summary).toMatchObject({ items: 2, dependencies: 3, errors: 2, warnings: 1 });
      expect(stdout.value).toContain('WeftGuard preflight');
      expect(stderr.value).toContain('fail-on=error');
    } finally {
      await rm(output, { recursive: true, force: true });
      process.exitCode = undefined;
    }
  });

  it('can emit reports without failing the pipeline', async () => {
    const output = await mkdtemp(join(tmpdir(), 'weftguard-cli-'));
    const stdout = new MemoryWritable();
    const stderr = new MemoryWritable();

    try {
      const result = await runPreflightCli(
        ['preflight', '--project', join(process.cwd(), 'examples', 'demo-fabric-production'), '--out', output, '--fail-on', 'never'],
        stdout,
        stderr
      );

      expect(result.exitCode).toBe(0);
      expect(stderr.value).toBe('');
    } finally {
      await rm(output, { recursive: true, force: true });
      process.exitCode = undefined;
    }
  });
});
