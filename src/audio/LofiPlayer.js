/**
 * 背景音乐。
 *
 * 优先播放 public/audio/bgm.mp3（你自己放一首 lofi 歌进去就行）。
 * 如果文件不存在，就用 WebAudio 现场合成一段循环的 lofi 和弦 —— 
 * 这样 Demo 点「背景音乐」立刻就有声音，不用等素材。
 */

const MIDI_A4 = 440
const midiToFreq = (m) => MIDI_A4 * Math.pow(2, (m - 69) / 12)

// Am7 → Fmaj7 → Cmaj7 → G6（第一个音是 bass）
const PROGRESSION = [
  [45, 57, 60, 64],
  [41, 53, 57, 60],
  [48, 60, 64, 67],
  [43, 55, 59, 64],
]

const BPM = 74
const BAR_SECONDS = (60 / BPM) * 4

export class LofiPlayer {
  constructor({ src = '/audio/bgm.mp3', volume = 0.55 } = {}) {
    this.src = src
    this.volume = volume
    this.playing = false
    this.mode = 'synth'
    this.ctx = null
    this.audioEl = null
    this._timer = null
    this._barIndex = 0
    this._nextTime = 0
    this.fileAvailable = null
  }

  async toggle() {
    if (this.playing) {
      this.pause()
      return false
    }
    await this.play()
    return true
  }

  async play() {
    if (this.playing) return
    if (this.fileAvailable === null) {
      this.fileAvailable = await this._probeFile()
    }
    if (this.fileAvailable) {
      this._playFile()
    } else {
      await this._playSynth()
    }
    this.playing = true
  }

  pause() {
    if (!this.playing) return
    this.playing = false
    if (this.mode === 'file' && this.audioEl) {
      this.audioEl.pause()
    } else if (this.ctx) {
      const now = this.ctx.currentTime
      this.master.gain.cancelScheduledValues(now)
      this.master.gain.setTargetAtTime(0, now, 0.2)
      clearInterval(this._timer)
      this._timer = null
      setTimeout(() => {
        if (!this.playing && this.ctx && this.ctx.state === 'running') {
          this.ctx.suspend().catch(() => {})
        }
      }, 600)
    }
  }

  setVolume(v) {
    this.volume = v
    if (this.audioEl) this.audioEl.volume = v
    if (this.master && this.playing) {
      this.master.gain.setTargetAtTime(v * 0.7, this.ctx.currentTime, 0.1)
    }
  }

  async _probeFile() {
    try {
      const res = await fetch(this.src, { method: 'HEAD' })
      if (!res.ok) return false
      const type = res.headers.get('content-type') || ''
      return !type.includes('text/html')
    } catch {
      return false
    }
  }

  _playFile() {
    if (!this.audioEl) {
      this.audioEl = new Audio(this.src)
      this.audioEl.loop = true
      this.audioEl.volume = this.volume
    }
    this.mode = 'file'
    this.audioEl.play().catch(() => {
      // 浏览器拦截时退回合成音
      this.fileAvailable = false
      this._playSynth()
    })
  }

  async _playSynth() {
    this.mode = 'synth'
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      this.ctx = new Ctx()
      this._buildGraph()
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume()

    const now = this.ctx.currentTime + 0.1
    this._nextTime = now
    this._barIndex = 0
    this.master.gain.cancelScheduledValues(now)
    this.master.gain.setValueAtTime(0, now)
    this.master.gain.linearRampToValueAtTime(this.volume * 0.7, now + 2.5)

    this._schedule()
    clearInterval(this._timer)
    this._timer = setInterval(() => this._schedule(), 200)
  }

  _buildGraph() {
    const ctx = this.ctx

    this.master = ctx.createGain()
    this.master.gain.value = 0
    this.master.connect(ctx.destination)

    // 低通：模拟旧唱片的闷
    this.filter = ctx.createBiquadFilter()
    this.filter.type = 'lowpass'
    this.filter.frequency.value = 1750
    this.filter.Q.value = 0.6
    this.filter.connect(this.master)

    // 回声
    this.delay = ctx.createDelay(1.0)
    this.delay.delayTime.value = 0.38
    this.feedback = ctx.createGain()
    this.feedback.gain.value = 0.26
    this.wet = ctx.createGain()
    this.wet.gain.value = 0.2
    this.delay.connect(this.feedback)
    this.feedback.connect(this.delay)
    this.delay.connect(this.wet)
    this.wet.connect(this.master)

    this.bus = ctx.createGain()
    this.bus.gain.value = 0.85
    this.bus.connect(this.filter)
    this.bus.connect(this.delay)

    // 黑胶底噪
    const noiseLen = ctx.sampleRate * 2
    const buffer = ctx.createBuffer(1, noiseLen, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < noiseLen; i++) data[i] = (Math.random() * 2 - 1) * 0.5
    const noise = ctx.createBufferSource()
    noise.buffer = buffer
    noise.loop = true
    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = 'bandpass'
    noiseFilter.frequency.value = 2400
    noiseFilter.Q.value = 0.8
    const noiseGain = ctx.createGain()
    noiseGain.gain.value = 0.035
    noise.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(this.master)
    noise.start()
    this.noise = noise
  }

  _schedule() {
    if (!this.ctx || this.ctx.state !== 'running') return
    const horizon = this.ctx.currentTime + 0.8
    while (this._nextTime < horizon) {
      this._scheduleBar(this._nextTime, this._barIndex)
      this._nextTime += BAR_SECONDS
      this._barIndex++
    }
  }

  _scheduleBar(time, index) {
    const chord = PROGRESSION[index % PROGRESSION.length]

    // Pad：整小节铺底
    chord.slice(1).forEach((note, i) => {
      this._pad(midiToFreq(note), time + i * 0.05, BAR_SECONDS * 0.98)
    })

    // Bass：每两拍一下
    this._bass(midiToFreq(chord[0]), time)
    this._bass(midiToFreq(chord[0]), time + BAR_SECONDS / 2)

    // 琶音：每半拍一个音，随机挑和弦音并升高八度
    const steps = 8
    for (let s = 0; s < steps; s++) {
      if (Math.random() < 0.18) continue
      const note = chord[1 + Math.floor(Math.random() * (chord.length - 1))] + 12
      const t = time + (s * BAR_SECONDS) / steps
      this._pluck(midiToFreq(note), t, 0.16 + Math.random() * 0.1)
    }
  }

  _pad(freq, time, dur) {
    const ctx = this.ctx
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, time)
    gain.gain.linearRampToValueAtTime(0.055, time + 0.7)
    gain.gain.linearRampToValueAtTime(0.0001, time + dur)
    gain.connect(this.bus)

    ;[-7, 7].forEach((detune) => {
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = freq
      osc.detune.value = detune
      osc.connect(gain)
      osc.start(time)
      osc.stop(time + dur + 0.05)
    })
  }

  _bass(freq, time) {
    const ctx = this.ctx
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, time)
    gain.gain.linearRampToValueAtTime(0.14, time + 0.06)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.1)
    gain.connect(this.filter)

    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq
    osc.connect(gain)
    osc.start(time)
    osc.stop(time + 1.2)
  }

  _pluck(freq, time, dur) {
    const ctx = this.ctx
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, time)
    gain.gain.linearRampToValueAtTime(0.075, time + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur + 0.25)
    gain.connect(this.bus)

    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = freq
    osc.connect(gain)
    osc.start(time)
    osc.stop(time + dur + 0.3)
  }

  dispose() {
    clearInterval(this._timer)
    if (this.audioEl) {
      this.audioEl.pause()
      this.audioEl.src = ''
    }
    if (this.ctx) this.ctx.close().catch(() => {})
  }
}
