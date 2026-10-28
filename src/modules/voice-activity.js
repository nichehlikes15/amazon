// Tells when you're talking, from how loud the microphone is (Web Audio API).
// This is much faster than waiting for speech-to-text, so Alex can notice
// straight away when you start talking, stop, or talk over him.
//
// Nothing is recorded or sent anywhere - it only reads the volume.

export async function createVoiceDetector() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  })
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) {
    stream.getTracks().forEach((t) => t.stop())
    throw new Error('Web Audio is not supported')
  }
  const ctx = new Ctx()
  if (ctx.state === 'suspended') {
    try { await ctx.resume() } catch { /* carry on - it may still work */ }
  }
  const source = ctx.createMediaStreamSource(stream)
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 1024
  analyser.smoothingTimeConstant = 0
  source.connect(analyser)
  const buf = new Float32Array(analyser.fftSize)

  return {
    // Loudness right now (RMS), roughly 0 (silent) to 0.3 (loud talking).
    read() {
      analyser.getFloatTimeDomainData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i += 1) sum += buf[i] * buf[i]
      return Math.sqrt(sum / buf.length)
    },
    stop() {
      stream.getTracks().forEach((t) => t.stop())
      try { source.disconnect() } catch { /* ignore */ }
      try { ctx.close() } catch { /* ignore */ }
    },
  }
}
