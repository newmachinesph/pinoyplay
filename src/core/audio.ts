type Effect = 'coin' | 'hit' | 'start' | 'move' | 'warning' | 'board' | 'rim' | 'floor' | 'step' | 'jump' | 'throw' | 'pour';
const musicFor = (game: string) => game === 'volcano-escape' ? 'ascent'
  : ['island-boat-racing', 'coconut-catcher', 'halo-halo-shop'].includes(game) ? 'islands' : 'barrio';

/** Local MP3 music and action-synchronized synthesis. Everything works offline. */
export class GameAudio {
  enabled = true;
  private context?: AudioContext;
  private sfx?: GainNode;
  private musicGain?: GainNode;
  private noise?: AudioBuffer;
  private buffers = new Map<string, AudioBuffer>();
  private pending = new Set<string>();
  private source?: AudioBufferSourceNode;
  private track = '';
  private offset = 0;
  private startedAt = 0;
  private activeGame = '';
  private lastStep = -1;
  private engine?: { oscillator: OscillatorNode; gain: GainNode; water: GainNode };

  unlock() {
    try {
      if (!this.context) {
        const ctx = this.context = new AudioContext();
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -14; compressor.ratio.value = 4;
        compressor.connect(ctx.destination);
        this.sfx = ctx.createGain(); this.sfx.gain.value = .7; this.sfx.connect(compressor);
        this.musicGain = ctx.createGain(); this.musicGain.gain.value = .32; this.musicGain.connect(compressor);
        this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const channel = this.noise.getChannelData(0);
        for (let i = 0; i < channel.length; i++) channel[i] = Math.random() * 2 - 1;
      }
      void this.context.resume().catch(() => {});
    } catch { /* Audio hardware is optional. */ }
  }
  private async loadMusic(track: string) {
    if (!this.context || this.pending.has(track) || this.buffers.has(track)) return;
    this.pending.add(track);
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}audio/${track}.mp3`);
      if (!response.ok) throw new Error(`Music ${response.status}`);
      this.buffers.set(track, await this.context.decodeAudioData(await response.arrayBuffer()));
    } catch (error) { console.warn('Music unavailable. Game effects remain available.', error); }
    // Keep failed tracks marked, avoiding a network retry every animation frame.
  }
  private stopMusic() {
    if (!this.source || !this.context) return;
    this.offset = (this.offset + this.context.currentTime - this.startedAt) % (this.source.buffer?.duration || 59);
    this.source.stop(); this.source.disconnect(); this.source = undefined;
  }
  update(game: string, running: boolean, speed = 0) {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running') return;
    const audible = this.enabled && running;
    this.activeGame = game;
    const nextTrack = musicFor(game);
    if (this.track !== nextTrack) { this.stopMusic(); this.track = nextTrack; this.offset = 0; }
    if (audible) {
      void this.loadMusic(this.track);
      const buffer = this.buffers.get(this.track);
      if (buffer && !this.source) {
        this.source = ctx.createBufferSource(); this.source.buffer = buffer; this.source.loop = true;
        this.source.connect(this.musicGain!); this.startedAt = ctx.currentTime;
        this.source.start(0, this.offset % buffer.duration);
      }
    } else this.stopMusic();
    if (!this.engine) {
      const oscillator = ctx.createOscillator(), gain = ctx.createGain(), filter = ctx.createBiquadFilter();
      oscillator.type = 'triangle'; gain.gain.value = 0; filter.frequency.value = 220;
      oscillator.connect(filter).connect(gain).connect(this.sfx!); oscillator.start();
      const wash = ctx.createBufferSource(), water = ctx.createGain(), band = ctx.createBiquadFilter();
      wash.buffer = this.noise!; wash.loop = true; water.gain.value = 0;
      band.type = 'lowpass'; band.frequency.value = 850;
      wash.connect(band).connect(water).connect(this.sfx!); wash.start();
      this.engine = { oscillator, gain, water };
    }
    const driving = ['jeepney-rush', 'tricycle-parking'].includes(game);
    this.engine.oscillator.frequency.setTargetAtTime(38 + Math.abs(speed) * 2, ctx.currentTime, .12);
    this.engine.gain.gain.setTargetAtTime(audible && driving ? .018 + Math.abs(speed) * .0004 : 0, ctx.currentTime, .04);
    this.engine.water.gain.setTargetAtTime(audible && game === 'island-boat-racing' ? .05 : 0, ctx.currentTime, .05);
  }
  motion(time: number, walking: boolean, basketball = false) {
    const beat = Math.floor(time / (basketball ? Math.PI / 10 : .22));
    if (walking && beat !== this.lastStep) this.play(basketball ? 'floor' : 'step');
    this.lastStep = beat;
  }
  private tone(from: number, to: number, duration: number, volume: number, type: OscillatorType = 'sine', delay = 0) {
    const ctx = this.context!, at = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator(), gain = ctx.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(from, at);
    oscillator.frequency.exponentialRampToValueAtTime(to, at + duration);
    gain.gain.setValueAtTime(.0001, at); gain.gain.exponentialRampToValueAtTime(volume, at + .004);
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    oscillator.connect(gain).connect(this.sfx!);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(at); oscillator.stop(at + duration + .01);
  }
  private burst(duration: number, frequency: number, volume: number, type: BiquadFilterType = 'lowpass') {
    const ctx = this.context!, at = ctx.currentTime;
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    source.buffer = this.noise!; filter.type = type; filter.frequency.value = frequency; filter.Q.value = .7;
    gain.gain.setValueAtTime(volume, at); gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    source.connect(filter).connect(gain).connect(this.sfx!);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    source.start(at, Math.random()); source.stop(at + duration);
  }
  play(kind: Effect) {
    if (!this.enabled || this.context?.state !== 'running') return;
    const game = this.activeGame;
    if (kind === 'jump') { this.tone(190, 430, .16, .08, 'triangle'); this.burst(.1, 1200, .05); return; }
    if (kind === 'throw') { this.burst(.2, 2000, .09, 'bandpass'); return; }
    if (kind === 'pour') { this.burst(.16, 3100, .07, 'bandpass'); this.tone(440, 610, .07, .035); return; }
    if (kind === 'floor') { this.tone(145, 56, .16, .24); this.burst(.06, 900, .12); return; }
    if (kind === 'board') { this.tone(245, 130, .2, .19, 'triangle'); this.burst(.08, 1600, .17); return; }
    if (kind === 'rim') { this.tone(740, 720, .28, .11); this.tone(1120, 1100, .12, .05); return; }
    if (kind === 'step') { this.burst(.055, 580, .09); this.tone(90, 60, .06, .04); return; }
    if (kind === 'hit') {
      this.burst(game === 'island-boat-racing' ? .45 : .18, game === 'island-boat-racing' ? 1700 : 550, .3);
      this.tone(125, 45, .22, .15, 'triangle'); return;
    }
    if (kind === 'coin') {
      if (game === 'basketball-sa-kanto') this.burst(.32, 2400, .13, 'bandpass');
      if (game === 'coconut-catcher') { this.tone(165, 75, .13, .17); this.burst(.1, 1600, .06); }
      if (game === 'tumbang-preso') { this.tone(630, 610, .35, .13); this.tone(970, 930, .2, .07); }
      if (game === 'island-boat-racing') this.burst(.24, 1900, .12);
      this.tone(784, 784, .13, .09); this.tone(1175, 1175, .25, .07, 'sine', .07); return;
    }
    if (kind === 'start') {
      [392, 494, 587, 784].forEach((note, i) => this.tone(note, note, .22, .07, 'triangle', i * .075)); return;
    }
    if (kind === 'warning') {
      this.tone(740, 740, .12, .08); this.tone(587, 587, .15, .07, 'sine', .16); return;
    }
    this.tone(260, 340, .045, .04); this.burst(.025, 1000, .025);
  }
}
