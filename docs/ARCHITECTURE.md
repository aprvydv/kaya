# Architecture

## Present state

KAYA includes a standalone Rust sample-buffer library and a React/Vite browser prototype. They are not connected yet. The browser uses built-in Web Audio decoding and native audio playback for a genuine local-file waveform preview.

## Target architecture

- Rust core: deterministic DSP operations, sample-format-aware import/export, and experiment provenance.
- Thin desktop integration: Tauri commands or a carefully specified bridge.
- React UI: waveform, spectrogram, metadata, annotations and processing history.
- Local persistence: source-file reference, operations, derived signals, hashes, settings.

## Evidence integrity

Browser-decoded audio data is not the same as original encoded file bytes; it may be converted or resampled. Future forensic workflows must preserve exact original bytes, source metadata, and reproducible conversion parameters. The UI prototype makes no forensic authenticity claims.
