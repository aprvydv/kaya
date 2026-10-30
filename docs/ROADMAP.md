# Roadmap

## Milestone 0 — Repository and working prototype

- [x] Rust workspace with tested AudioBuffer primitive (CI runs tests)
- [x] React/Vite single-screen interface
- [x] Local audio loading, waveform preview and playback via Web Audio and HTML audio
- [ ] Tauri app and Rust bridge

## Milestone 1 — Signal inspection

- [ ] Original-file SHA-256 and WAV header metadata
- [ ] Accurate channel-specific waveform and zoom
- [ ] FFT spectrogram and synchronized time cursor
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
