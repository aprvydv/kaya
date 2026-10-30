# Roadmap

## Milestone 0 — Repository and working prototype

- [x] Rust workspace with tested AudioBuffer primitive (CI runs tests)
- [x] React/Vite single-screen interface
- [x] Local audio loading, waveform preview and playback via Web Audio and HTML audio
- [ ] Tauri app and Rust bridge

## Milestone 1 — Signal inspection

- [x] Classic RIFF/WAVE metadata and original-file SHA-256 in separate Rust and browser inspectors (Rust/UI bridge pending)
- [x] Browser-decoded channel-specific min/max waveform with zoom/pan and playback-linked seeking
- [x] Browser-decoded Hann-windowed FFT spectrogram, shared time view and waveform playback cursor (spectrogram cursor and native Rust integration pending)
- [ ] Sample value inspector

## Milestone 2 — Reproducible audio operations

- [ ] Non-destructive gain/trim/filter pipeline
- [ ] Operation parameter and version history
- [ ] Source/output export and regression tests

## Milestone 3 — Steganography research

- [ ] LSB embedding and extraction on supported lossless PCM formats
- [ ] Capacity, SNR, PSNR, BER metrics
- [ ] Controlled noise/resampling/compression tests
- [ ] Structured experiment reports

## Milestone 4 — Extensibility

- [ ] Documented plugin protocol
- [ ] Batch benchmarks and experiment comparison
- [ ] Steganalysis research workflows
