import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { app } from './index.js';
import http from 'http';

describe('Backend Integration Suite', () => {
  let server: http.Server;
  const baseUrl = 'http://localhost:3010/api';

  beforeAll(async () => {
    server = http.createServer(app.getApp());
    await new Promise<void>((resolve) => server.listen(3010, resolve));
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('GET /health returns healthy database status', async () => {
    const res = await fetch(`${baseUrl}/health`);
    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.services.database).toBe('healthy');
  });

  it('GET /labels returns seeded labels with song counts', async () => {
    const res = await fetch(`${baseUrl}/labels`);
    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);
  });

  it('GET /songs returns seeded songs with associated labels', async () => {
    const res = await fetch(`${baseUrl}/songs`);
    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);
    expect(Array.isArray(data.data[0].labels)).toBe(true);
  });

  it('POST /songs creates a song in transaction with labels', async () => {
    const labelRes = await fetch(`${baseUrl}/labels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `TestTag-${Date.now()}`, color: '#3b82f6', instrument: 'GUITAR' }),
    });
    const labelData = await labelRes.json() as any;
    const labelId = labelData.data.id;

    const res = await fetch(`${baseUrl}/songs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Suite Test Song',
        artist: 'Test Suite',
        songKey: 'C',
        capo: 0,
        content: '[C]Praise [G]Him',
        labelIds: [labelId],
      }),
    });
    const data = await res.json() as any;
    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.title).toBe('Suite Test Song');
    expect(data.data.labels.length).toBe(1);
    expect(data.data.labels[0].id).toBe(labelId);

    // Cleanup
    await fetch(`${baseUrl}/songs/${data.data.id}`, { method: 'DELETE' });
    await fetch(`${baseUrl}/labels/${labelId}`, { method: 'DELETE' });
  });

  it('POST /songs returns 400 Bad Request on invalid schema payload', async () => {
    const res = await fetch(`${baseUrl}/songs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '' }),
    });
    expect(res.status).toBe(400);
  });
});
