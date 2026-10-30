//! KAYA foundational, non-destructive audio buffer operations.
//! This module does not yet implement audio decoding or steganography.

#[derive(Clone, Debug, PartialEq)]
pub struct AudioBuffer {
    sample_rate: u32,
    samples: Vec<f32>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum AudioError {
    InvalidSampleRate,
    NonFiniteSample,
    InvalidGain,
}

impl AudioBuffer {
    pub fn new(sample_rate: u32, samples: Vec<f32>) -> Result<Self, AudioError> {
        if sample_rate == 0 { return Err(AudioError::InvalidSampleRate); }
        if samples.iter().any(|x| !x.is_finite()) { return Err(AudioError::NonFiniteSample); }
        Ok(Self { sample_rate, samples })
    }
    pub fn sample_rate(&self) -> u32 { self.sample_rate }
    pub fn samples(&self) -> &[f32] { &self.samples }
    pub fn duration_seconds(&self) -> f64 { self.samples.len() as f64 / self.sample_rate as f64 }
    /// Create an independent buffer without mutating the source. Clipping is not automatic.
    pub fn with_gain(&self, gain: f32) -> Result<Self, AudioError> {
        if !gain.is_finite() { return Err(AudioError::InvalidGain); }
        let samples: Vec<f32> = self.samples.iter().map(|x| x * gain).collect();
        if samples.iter().any(|x| !x.is_finite()) { return Err(AudioError::NonFiniteSample); }
        Self::new(self.sample_rate, samples)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn gain_preserves_original() {
        let original = AudioBuffer::new(48000, vec![0.25, -0.5]).unwrap();
        let changed = original.with_gain(2.0).unwrap();
        assert_eq!(original.samples(), &[0.25, -0.5]);
        assert_eq!(changed.samples(), &[0.5, -1.0]);
    }
    #[test]
    fn rejects_invalid_input() {
        assert_eq!(AudioBuffer::new(0, vec![0.0]), Err(AudioError::InvalidSampleRate));
        assert_eq!(AudioBuffer::new(44100, vec![f32::NAN]), Err(AudioError::NonFiniteSample));
    }
    #[test]
    fn duration() {
        let b = AudioBuffer::new(2, vec![0.0; 5]).unwrap();
        assert_eq!(b.duration_seconds(), 2.5);
    }
}
