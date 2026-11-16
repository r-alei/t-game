import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KahyaMicrophone } from '../client/src/games/dugun/microphone.ts';

describe('Kâhya mikrofonu', () => {
  let mic: KahyaMicrophone;
  let amplitude: number;
  let stop: ReturnType<typeof vi.fn>;
  let close: ReturnType<typeof vi.fn>;
  let getUserMedia: ReturnType<typeof vi.fn>;
  let track: { stop: ReturnType<typeof vi.fn>; onended: (() => void) | null };
  beforeEach(() => {
    amplitude = 0;
    stop = vi.fn(); close = vi.fn().mockResolvedValue(undefined);
    track = { stop, onended: null };
    getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [track], getAudioTracks: () => [track] });
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    vi.stubGlobal('AudioContext', class {
      state = 'running';
      close = close;
      resume = vi.fn().mockResolvedValue(undefined);
      createMediaStreamSource = () => ({ connect: vi.fn() });
      createAnalyser = () => ({ fftSize: 1024, getFloatTimeDomainData: (samples: Float32Array) => samples.fill(amplitude) });
    });
    mic = new KahyaMicrophone();
  });
  afterEach(() => { mic.stop(); vi.unstubAllGlobals(); });

  it('RMS ölçer; düşük fan sesini kapılar, konuşmada açılır, sessizlikte yumuşak kapanır', async () => {
    await mic.configure(true, 0.025);
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(mic.status).toBe('ready');
    amplitude = 0.008;
    for (let i = 0; i < 120; i++) mic.update(1 / 60);
    expect(mic.level).toBeCloseTo(0.008, 4);
    expect(mic.speech).toBe(0);
    amplitude = 0.09;
    for (let i = 0; i < 60; i++) mic.update(1 / 60);
    expect(mic.speech).toBeGreaterThan(0.95);
    amplitude = 0;
    mic.update(1 / 60);
    expect(mic.speech).toBeGreaterThan(0);
    for (let i = 0; i < 120; i++) mic.update(1 / 60);
    expect(mic.speech).toBeLessThan(0.001);
    await mic.configure(false, 0.025);
    expect(stop).toHaveBeenCalled(); expect(close).toHaveBeenCalled();
    expect(mic.getState()).toMatchObject({ status: 'off', level: 0, enabled: false });
  });

  it('izin reddedilirse sessiz kalır; kapat/aç ile tekrar denenebilir', async () => {
    getUserMedia.mockRejectedValueOnce(new Error('İzin reddedildi'));
    await mic.configure(true, 0.025);
    expect(mic.getState()).toMatchObject({ status: 'unavailable', level: 0, enabled: true });
    expect(() => mic.update(1)).not.toThrow();
    await mic.configure(true, 0.05);
    expect(mic.status).toBe('ready');
    expect(mic.threshold).toBe(0.05);
    await mic.configure(true, 0.06);
    expect(getUserMedia).toHaveBeenCalledTimes(2);
  });

  it('izin beklenirken kapanan mikrofon geç gelen akışı açık bırakmaz', async () => {
    let resolve!: (value: unknown) => void;
    getUserMedia.mockReturnValue(new Promise((r) => { resolve = r; }));
    const pending = mic.configure(true, 0.025);
    expect(mic.status).toBe('requesting');
    mic.stop();
    resolve({ getTracks: () => [track], getAudioTracks: () => [track] });
    await pending;
    expect(stop).toHaveBeenCalledOnce();
    expect(mic.status).toBe('off');
  });

  it('cihaz bağlantısı kesilince kaynakları kapatır ve mikrofon yok durumuna döner', async () => {
    await mic.configure(true, 0.025);
    track.onended?.();
    expect(mic.status).toBe('unavailable');
    expect(stop).toHaveBeenCalled(); expect(close).toHaveBeenCalled();
  });
});
