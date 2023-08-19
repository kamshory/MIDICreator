class MidiCreator {
  constructor(conf) {
    conf = conf || {};

    /**
     * Tempo or beat per minute
     */
    this.tempo = conf.tempo || 130;

    /**
     * Pulses per quarter note
     */
    this.ppqn = conf.ppqn || 96;
    /**
     * Maximum tempo (for realtime converting only)
     */
    this.maxTempo = conf.maxTempo || 720;

    /**
     * Channel number to used
     */
    this.channel = conf.channel || 0;

    /**
     * Minimum frequency to be process
     */
    this.pitchMin = conf.pitchMin || 20;

    /**
     * Maximum frequency to be process
     */
    this.pitchMax = conf.pitchMax || 20000;

    /**
     * Threshold RMS
     */
    this.thresholdRms = conf.thresholdRms || 0.01;

    /**
     * Threshold amplitude
     */
    this.thresholdAmplitude = conf.thresholdAmplitude || 0.2;

    /**
     * Resolution
     */
    this.resolution = conf.resolution || 32;

    /**
     * Sample rate
     */
    this.sampleRate = conf.sampleRate || 32000;

    /**
     * Minimum sampe fo analize frequancy and amplitude
     */
    this.minSample = this.minSample || 500;

    this.barDuration = 60 / (this.tempo * this.ppqn);
    this.timeOffset = 0;
    this.midiData = [];
    this.lastNote = null;
    this.lastTime = 0;
    this.waveformArray = null;
    this.noteFlats = "C Db D Eb E F Gb G Ab A Bb B".split(" ");
    this.noteSharps = "C C# D D# E F F# G G# A A# B".split(" ");
    this.minInterval = 60000 / (this.tempo * this.resolution);
    this.sumPitch = 0;
    this.countPitch = 0;

    /**
     * Preview note
     * @param {Object} data MIDI event information
     */
    this.onPreviewNote = function (data) {};

    /**
     * Get note from pitch
     * @param {Number} frequency Frequency calculated by autoCorrelate samples
     * @returns {Number} Midi note code
     */
    this.noteFromPitch = function (frequency) {
      let noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
      return Math.round(noteNum) + 69;
    };

    /**
     * Get frequency from MIDI note number
     * @param {Number} midi Get frequency from MIDI note code
     * @returns {Number} Frequency in Hertz
     */
    this.frequencyFromNoteNumber = function (midi) {
      return 440 * Math.pow(2, (midi - 69) / 12);
    };

    /**
     * Get centsOff from pitch
     * @param {Number} frequency Frequency in Hertz
     * @param {Number} midi Get frequency from MIDI note code
     * @returns
     */
    this.centsOffFromPitch = function (frequency, midi) {
      return Math.floor(
        (1200 * Math.log(frequency / frequencyFromNoteNumber(midi))) /
          Math.log(2)
      );
    };

    /**
     * Get pitch from note
     * @param {string} note Note
     * @returns {Number} Frequency in Hertz
     */
    this.pitchFromNote = function (note) {
      let arr = [];
      if (note.indexOf("#") != -1) {
        arr = this.noteSharps;
      } else {
        arr = this.noteFlats;
      }
      let noteName = note.replace(/[0-9]/g, ""); //NOSONAR
      let octaveValue = parseInt(note.replace(/[^0-9]/g, "")); //NOSONAR
      let index = arr.indexOf(noteName);
      if (index == -1) {
        throw new Error("Invalid note name");
      }
      return this.pitchFromIndexAndOctave(index, octaveValue);
    };

    /**
     * Get pitch from index and octave
     * @param {Number} index Index
     * @param {Number} octave Octave
     * @returns {Number} Frequency in Hertz
     */
    this.pitchFromIndexAndOctave = function (index, octave) {
      return 440 * Math.pow(Math.pow(2, 1 / 12), octave * 12 + index - 57);
    };

    /**
     * Get octave from note
     * @param {Number} note MIDI note code
     * @returns {Number} Octave
     */
    this.octaveFromNote = function (note) {
      return parseInt(note / 12) - 1;
    };

    /**
     * Reset MIDI
     */
    this.resetMidi = function () {
      this.timeOffset = this.now();
      this.midiData = [];
      this.lastNote = null;
    };

    /**
     * Check if pitch is invalid
     * @param {Number} pitch 
     * @param {boolean} force 
     * @returns {boolean} true if pitch is invalid or always false if force is true
     */
    this.isInvalidPitch = function (pitch, force) {
      return !force && (pitch < this.pitchMin || pitch > this.pitchMax);
    };

    /**
     * Check if interval is invalid
     * @param {Number} currentTime 
     * @param {boolean} force 
     * @returns {boolean} true if interval is invalid or always false if force is true
     */
    this.isInvalidInterval = function (currentTime, force) {
      return !force && currentTime - this.lastTime < this.minInterval;
    };

    /**
     * Get velocity from amplitude
     * @param {Number} amplitude Amplitude (0 to 1)
     * @returns {Number} Velocity
     */
    this.getVelocity = function(amplitude)
    {
      let velocity = 40 + 200 * amplitude;
      if (velocity > 127) {
        velocity = 127;
      }
      return velocity;
    }

    /**
     * Add pitch for avegare
     * @param {Number} pitch 
     */
    this.addPitch = function(pitch)
    {
      this.sumPitch += pitch;
      this.countPitch++;
    }

    /**
     * Get pitch average and clear pitch
     * @returns Pitch average
     */
    this.clearPitch = function()
    {
      let avg = this.getPitchAverage();
      this.sumPitch = 0;
      this.countPitch = 0;  
      return avg;
    }

    /**
     * Get pitch average
     * @returns Pitch average
     */
    this.getPitchAverage = function()
    {
      if(this.countPitch == 0)
      {
        return 0;
      }
      return this.sumPitch / this.countPitch;
    }

    /**
     * Add note
     * @param {Number} pitch Pitch 
     * @param {Number} amplitude Amplitude
     * @param {Number} currentTime Current time
     * @param {boolean} force Force
     * @returns void
     */
    this.addNote = function (pitch, amplitude, currentTime, force) {
      if (this.isInvalidPitch(pitch, force)) {
        return;
      }
      // add pitch
      this.addPitch(pitch);
      currentTime = currentTime || this.now();
      if (this.isInvalidInterval(currentTime, force)) {
        return;
      }
      this.lastTime = currentTime;
      // get note from pitch average
      let note = this.noteFromPitch(this.clearPitch());
      let velocity = this.getVelocity(amplitude);
      
      let process = false;
      if (
        !process &&
        note == null &&
        this.lastNote != null &&
        !isNaN(this.lastNote)
      ) {
        // last note off
        if (this.midiData.length > 0) {
          let start = this.midiData[this.midiData.length - 1].time;
          this.midiData[this.midiData.length - 1].duration =
            currentTime - this.timeOffset - start;
        }
        process = true;
      }
      if (!process && note != null && !isNaN(note)) {
        // last note off
        if (this.midiData.length > 0) {
          let start = this.midiData[this.midiData.length - 1].time;
          this.midiData[this.midiData.length - 1].duration =
            currentTime - start;
          this.midiData[this.midiData.length - 1].close = true;
        }
        if (note != this.lastNote) {
          // new note on
          let noteName = this.noteFromNumber(note, false);
          let newData = {
            name: noteName,
            midi: note,
            velocity: Math.round(velocity),
            time: currentTime,
            duration: 0.1,
            close: false,
          };
          this.midiData.push(newData);
          this.onPreviewNote(newData);
        }
      }

      this.lastNote = note;
    };

    /**
     * Get current time in unix timestamp
     * @returns {Number}
     */
    this.now = function () {
      return new Date().getTime();
    };

    /**
     * Convert time in millisecond into midi time
     * @param {Number} time
     * @returns {Number}
     */
    this.midiTime = function (time) {
      return Math.round(time / this.barDuration / 1000);
    };

    /**
     * Create MIDI
     */
    this.createMidi = function (raw) {
      let smf = new JZZ.MIDI.SMF(0, this.ppqn);
      let track1 = new JZZ.MIDI.SMF.MTrk();

      track1.add(0, JZZ.MIDI.smfBPM(this.tempo));

      let time1 = 0;
      let time2 = 0;

      if (!this.midiData[this.midiData.length - 1].close) {
        this.midiData[this.midiData.length - 1].duration =
          this.now() - this.midiData[this.midiData.length - 1].start;
          this.midiData[this.midiData.length - 1].close = true;
      }

      for (let i in this.midiData) {
        time1 = this.midiTime(this.midiData[i].time);

        // send event note On at time1
        track1.add(
          time1,
          JZZ.MIDI.noteOn(
            this.channel,
            this.midiData[i].name,
            this.midiData[i].velocity
          )
        );

        // send event note Off at time1
        time2 = this.midiTime(
          this.midiData[i].time + this.midiData[i].duration
        );
        if (!isNaN(time2)) {
          let note = JZZ.MIDI.noteOff(this.channel, this.midiData[i].name);
          track1.add(time2, note);
        } else {
          time2 = time1;
        }
      }

      track1.add(time2, JZZ.MIDI.smfEndOfTrack());

      smf.push(track1);

      let str = smf.dump(); // MIDI file dumped as a string
      if (raw) {
        return str;
      }
      return JZZ.lib.toBase64(str); // convert to base-64 string
    };

    /**
     * Get note from number
     * @param {Number} midi
     * @param {boolean} sharps
     * @returns {string}
     */
    this.noteFromNumber = function (midi, sharps) {
      midi = Math.round(midi);
      let pcs = sharps === true ? this.noteSharps : this.noteFlats;
      let pc = pcs[midi % 12];
      let o = Math.floor(midi / 12) - 1;
      return pc + o;
    };

    /**
     * Get pitch infomation
     * @param {FlatArray} buffer
     * @param {Number} sampleRate
     * @returns {Object}
     */
    this.autoCorrelate = function (buffer, sampleRate) {
      // Implements the ACF2+ algorithm
      let bufSize = buffer.length;
      let rms = 0;

      let velocity = 0;
      let vel = 0;
      for (let i = 0; i < bufSize; i++) {
        let val = buffer[i];
        rms += val * val;
        vel += Math.abs(val);
      }
      velocity = vel / bufSize;
      rms = Math.sqrt(rms / bufSize);
      if (rms < 0.01) {
        // not enough signal
        return { pitch: -1, rms: rms, velocity: velocity };
      }

      let r1 = 0;
      let r2 = bufSize - 1;
      let thres = 0.2;
      for (let i = 0; i < bufSize / 2; i++) {
        if (Math.abs(buffer[i]) < thres) {
          r1 = i;
          break;
        }
      }
      for (let i = 1; i < bufSize / 2; i++) {
        if (Math.abs(buffer[bufSize - i]) < thres) {
          r2 = bufSize - i;
          break;
        }
      }

      buffer = buffer.slice(r1, r2);
      bufSize = buffer.length;

      let c = new Array(bufSize).fill(0);
      for (let i = 0; i < bufSize; i++) {
        for (let j = 0; j < bufSize - i; j++) {
          c[i] = c[i] + buffer[j] * buffer[j + i];
        }
      }

      let d = 0;
      while (c[d] > c[d + 1]) {
        d++;
      }
      let maxval = -1;
      let maxpos = -1;
      for (let i = d; i < bufSize; i++) {
        if (c[i] > maxval) {
          maxval = c[i];
          maxpos = i;
        }
      }
      let t0 = maxpos;
      let x1 = c[t0 - 1];
      let x2 = c[t0];
      let x3 = c[t0 + 1];
      let a = (x1 + x3 - 2 * x2) / 2;
      let b = (x3 - x1) / 2;
      t0 = this.fixPitch(t0, a, b);
      return { pitch: sampleRate / t0, rms: rms, velocity: velocity };
    };

    /**
     * Fix pitch
     * @param {Number} t
     * @param {Number} a
     * @param {Number} b
     * @returns
     */
    this.fixPitch = function (t, a, b) {
      if (a) {
        t = t - b / (2 * a);
      }
      return t;
    };

    /**
     * Load data from remote file
     * @param {string} path Remote path
     * @param {function} callback Callback function triggered when audio data has been decoded
     */
    this.loadRemoteAudioFile = function (path, callback) {
      let audioContext = new AudioContext({
        sampleRate: this.sampleRate,
      });
      let ajaxRequest = new XMLHttpRequest();
      ajaxRequest.open("GET", path, true);
      ajaxRequest.responseType = "arraybuffer";
      let float32Array = null;
      ajaxRequest.onload = () => {
        audioContext
          .decodeAudioData(ajaxRequest.response)
          .then((decodedData) => {
            float32Array = decodedData.getChannelData(0);
            _this.waveformArray = float32Array;
            if (typeof callback == "function") {
              callback(float32Array);
            }
          })
          .catch((err) => {
            // handle exception here
            console.error(err);
          });
      };
      ajaxRequest.send();
    };

    /**
     * Load data from local file
     * @param {File} file local file
     * @param {function} callback Callback function triggered when audio data has been decoded
     */
    this.loadLocalAudioFile = function (file, callback) {
      let audioContext = new AudioContext({
        sampleRate: this.sampleRate,
      });
      var reader1 = new FileReader();
      reader1.onload = function (ev) {
        let float32Array = null;
        // Decode audio
        audioContext
          .decodeAudioData(ev.target.result)
          .then(function (decodedData) {
            float32Array = decodedData.getChannelData(0);
            _this.waveformArray = float32Array;
            if (typeof callback == "function") {
              callback(float32Array);
            }
          });
      };
      reader1.readAsArrayBuffer(file);
    };

    /**
     * Get chunk size from sample, tempo and resolution
     * @returns {Number}
     */
    this.getChunkSize = function () {
      return (this.sampleRate * 240) / (this.tempo * this.resolution);
    };

    /**
     * Get current time by position
     * @param {Number} position
     * @returns {Number}
     */
    this.getCurrentTime = function (position) {
      return (position * 60000) / (this.tempo * this.sampleRate);
    };

    /**
     * Create not from sound
     * @returns {Object}
     */
    this.soundToNote = function () {
      this.resetMidi();
      let bufferSize = this.waveformArray.length;
      let max = bufferSize - 1;
      let chunkSize = this.getChunkSize();
      let start = 0;
      let end = 0;
      let offset = {};
      do {
        // get real end of data
        end = this.getEnd(start, end, max, chunkSize);

        // not all data will be processed
        offset = this.getOffset(start, end);

        let buffer = this.waveformArray.slice(offset.start, offset.end);

        let ac = this.autoCorrelate(buffer, this.sampleRate);

        if (typeof ac.pitch != "undefined") {
          let currentTime = this.getCurrentTime(start);
          this.addNote(ac.pitch, ac.velocity, currentTime);
        }

        start = end;
      } while (end < max);

      return this;
    };

    /**
     * Get real end of data
     * @param {Number} start
     * @param {Number} end
     * @param {Number} max
     * @param {Number} cSize
     * @returns {Number}
     */
    this.getEnd = function (start, end, max, cSize) {
      end = start + cSize;
      if (end > max) {
        end = max;
      }
      return end;
    };

    /**
     * Get offset
     * @param {Number} start Start
     * @param {Number} end End
     * @returns {Object}
     */
    this.getOffset = function (start, end) {
      let end2 = end;
      if (end2 - start > this.minSample) {
        end2 = start + this.minSample;
      }
      return { start: start, end: end2 };
    };

    let _this = this;
  }
}
