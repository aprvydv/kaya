# KAYA

**Explore what sound conceals.**

KAYA is an early-stage open-source audio engineering, signal analysis, and digital forensics workstation. Our goal is to unite reliable audio inspection, non-destructive editing, reproducible signal experiments, and steganography research.

> **Status: pre-alpha.** The first interface supports local audio loading, playback, and waveform inspection in the browser. The Rust core is not yet connected to the UI. This software is not a validated forensic instrument.

## Run the prototype

Requirements: Node.js 22+, npm.

```bash
cd apps/desktop
npm install
npm run dev
```

Select a local audio file. The browser's decoding engine is used for playback and waveform drawing. Your file is not uploaded to a server.

## Test the Rust core

Install the Rust stable toolchain, then run `cargo test --workspace` from the repository root.

## Product principles

- Preserve source files and distinguish decoded audio from original bytes.
- Keep analyses reproducible and report parameters.
- Separate DSP engine from its visual interface.
- Benchmark algorithms instead of claiming imperceptibility or forensic certainty.

## Repository

- `apps/desktop`: React + TypeScript frontend prototype (Tauri integration planned).
- `crates/kaya-core`: Rust audio-buffer processing core.
- `docs`: architecture and product roadmap.

## Near-term roadmap

1. Import WAV files with sample-format and metadata inspection.
2. Build zoomable waveform and FFT spectrogram.
3. Connect a non-destructive Rust processing engine to the interface.
4. Add sample-level inspection and LSB steganography experiments.
5. Add documented transformations, repeatable measurements, and export.

## License

MIT for code authored in this repository. Third-party dependencies retain their own licenses.
