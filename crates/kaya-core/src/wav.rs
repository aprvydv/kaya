//! Strict, read-only inspection of classic little-endian RIFF/WAVE files.
//! Exact source bytes remain owned by the caller; only metadata and SHA-256 are returned.
use sha2::{Digest, Sha256};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum WavError {
    TooShort, NotWave, TruncatedChunk, MissingFormat, MissingData,
    InvalidFormat, UnsupportedFormat, InvalidDataSize, SizeMismatch,
}
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WavInfo {
    pub audio_format: u16,
    pub channels: u16,
    pub sample_rate: u32,
    pub byte_rate: u32,
    pub block_align: u16,
    pub bits_per_sample: u16,
    pub frames: u64,
    pub data_bytes: usize,
    pub data_offset: usize,
    pub source_sha256: String,
}
impl WavInfo {
    pub fn duration_seconds(&self) -> f64 { self.frames as f64 / self.sample_rate as f64 }
}
fn u16le(b: &[u8], n: usize) -> Option<u16> {
    Some(u16::from_le_bytes(b.get(n..n.checked_add(2)?)?.try_into().ok()?))
}
fn u32le(b: &[u8], n: usize) -> Option<u32> {
    Some(u32::from_le_bytes(b.get(n..n.checked_add(4)?)?.try_into().ok()?))
}
/// Accepts RIFF/WAVE PCM integer (8/16/24/32) or IEEE float (32/64).
/// Rejects RF64, WAVE_FORMAT_EXTENSIBLE, compressed encodings, and trailing bytes
/// beyond the RIFF declared end; future versions can extend these explicitly.
pub fn inspect_wav(bytes: &[u8]) -> Result<WavInfo, WavError> {
    if bytes.len() < 12 { return Err(WavError::TooShort); }
    if &bytes[0..4] != b"RIFF" || &bytes[8..12] != b"WAVE" {
        return Err(WavError::NotWave);
    }
    let declared = u32le(bytes, 4).ok_or(WavError::TooShort)? as usize;
    let end = declared.checked_add(8).ok_or(WavError::SizeMismatch)?;
    if end != bytes.len() { return Err(WavError::SizeMismatch); }
    let (mut fmt, mut data) = (None, None);
    let mut pos = 12usize;
    while pos < end {
        if end - pos < 8 { return Err(WavError::TruncatedChunk); }
        let size = u32le(bytes, pos + 4).ok_or(WavError::TruncatedChunk)? as usize;
        let start = pos + 8;
        let stop = start.checked_add(size).ok_or(WavError::TruncatedChunk)?;
        let padded = stop.checked_add(size & 1).ok_or(WavError::TruncatedChunk)?;
        if padded > end { return Err(WavError::TruncatedChunk); }
        match &bytes[pos..pos + 4] {
            b"fmt " if fmt.is_none() => fmt = Some((start, size)),
            b"data" if data.is_none() => data = Some((start, size)),
            _ => {}
        }
        pos = padded;
    }
    let (f, fmt_size) = fmt.ok_or(WavError::MissingFormat)?;
    let (d, data_size) = data.ok_or(WavError::MissingData)?;
    if fmt_size < 16 { return Err(WavError::InvalidFormat); }
    let format = u16le(bytes, f).ok_or(WavError::InvalidFormat)?;
    let channels = u16le(bytes, f + 2).ok_or(WavError::InvalidFormat)?;
    let rate = u32le(bytes, f + 4).ok_or(WavError::InvalidFormat)?;
    let byte_rate = u32le(bytes, f + 8).ok_or(WavError::InvalidFormat)?;
    let align = u16le(bytes, f + 12).ok_or(WavError::InvalidFormat)?;
    let bits = u16le(bytes, f + 14).ok_or(WavError::InvalidFormat)?;
    if !((format == 1 && [8,16,24,32].contains(&bits)) ||
         (format == 3 && [32,64].contains(&bits))) {
        return Err(WavError::UnsupportedFormat);
    }
    let expected_align = (channels as u32).checked_mul((bits / 8) as u32);
    if channels == 0 || rate == 0 || expected_align != Some(align as u32)
        || align == 0 || rate.checked_mul(align as u32) != Some(byte_rate) {
        return Err(WavError::InvalidFormat);
    }
    if data_size % align as usize != 0 { return Err(WavError::InvalidDataSize); }
    let hash = Sha256::digest(bytes);
    Ok(WavInfo {
        audio_format: format, channels, sample_rate: rate,
        byte_rate, block_align: align, bits_per_sample: bits,
        frames: (data_size / align as usize) as u64, data_bytes: data_size,
        data_offset: d, source_sha256: format!("{hash:x}"),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    fn wav(bits: u16, channels: u16, frames: u16) -> Vec<u8> {
        let align = channels * (bits / 8);
        let data_len = frames as u32 * align as u32;
        let mut b = Vec::new();
        b.extend(b"RIFF");
        b.extend((36 + data_len).to_le_bytes());
        b.extend(b"WAVEfmt ");
        b.extend(16u32.to_le_bytes());
        b.extend(1u16.to_le_bytes());
        b.extend(channels.to_le_bytes());
        b.extend(44100u32.to_le_bytes());
        b.extend((44100u32 * align as u32).to_le_bytes());
        b.extend(align.to_le_bytes());
        b.extend(bits.to_le_bytes());
        b.extend(b"data");
        b.extend(data_len.to_le_bytes());
        b.extend(vec![0; data_len as usize]);
        b
    }
    #[test]
    fn parses_pcm_and_preserves_source() {
        for bits in [8,16,24,32] {
            let bytes = wav(bits,2,20);
            let untouched = bytes.clone();
            let info = inspect_wav(&bytes).unwrap();
            assert_eq!(info.bits_per_sample, bits);
            assert_eq!(info.frames, 20);
            assert_eq!(info.data_offset, 44);
            assert_eq!(info.source_sha256.len(), 64);
            assert_eq!(bytes, untouched);
        }
    }
    #[test]
    fn rejects_corrupt_and_inconsistent_files() {
        assert_eq!(inspect_wav(&[]), Err(WavError::TooShort));
        let mut b = wav(16,1,2);
        b[0] = b'X';
        assert_eq!(inspect_wav(&b), Err(WavError::NotWave));
        let mut b = wav(16,1,2);
        b.pop();
        assert_eq!(inspect_wav(&b), Err(WavError::SizeMismatch));
        let mut b = wav(16,1,2);
        b[32] = 0;
        assert_eq!(inspect_wav(&b), Err(WavError::InvalidFormat));
        let mut b = wav(16,1,2);
        b[20] = 6;
        assert_eq!(inspect_wav(&b), Err(WavError::UnsupportedFormat));
    }
    #[test]
    fn handles_unknown_odd_sized_chunks() {
        let mut b = wav(16,1,2);
        b.splice(12..12, [b'J',b'U',b'N',b'K',1,0,0,0,42,0]);
        let len = (b.len()-8) as u32;
        b[4..8].copy_from_slice(&len.to_le_bytes());
        assert_eq!(inspect_wav(&b).unwrap().data_offset, 54);
    }
    #[test]
    fn hash_is_exact_source_hash() {
        let info = inspect_wav(&wav(16,1,0)).unwrap();
        assert_eq!(info.source_sha256.len(), 64);
        assert_ne!(info.source_sha256, inspect_wav(&wav(16,2,0)).unwrap().source_sha256);
    }
}
