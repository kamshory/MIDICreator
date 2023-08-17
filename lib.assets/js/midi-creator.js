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

    this.barDuration = 60 / (this.tempo * this.ppqn);
    this.timeOffset = 0;
    this.midiData = [];
    this.lastNote = null;
    this.lastTime = 0;
    this.waveformArray = null;
    this.noteFlats = "C Db D Eb E F Gb G Ab A Bb B".split(" ");
    this.noteSharps = "C C# D D# E F F# G G# A A# B".split(" ");
    this.minInterval = 60000 / (this.tempo * this.resolution);

    /**
     * Get note from pitch
     * @param {number} frequency
     * @returns Midi note code
     */
    this.noteFromPitch = function (frequency) {
      let noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
      return Math.round(noteNum) + 69;
    };

    /**
     * Get frequency from MIDI note number
     * @param {number} note
     * @returns Frequency in Hertz
     */
    this.frequencyFromNoteNumber = function (note) {
      return 440 * Math.pow(2, (note - 69) / 12);
    };

    this.centsOffFromPitch = function (frequency, note) {
      return Math.floor(
        (1200 * Math.log(frequency / frequencyFromNoteNumber(note))) /
          Math.log(2)
      );
    };

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

    this.pitchFromIndexAndOctave = function (index, octaveValue) {
      return 440 * Math.pow(Math.pow(2, 1 / 12), octaveValue * 12 + index - 57);
    };

    this.octaveFromNote = function (note) {
      return parseInt(note / 12) - 1;
    };

    this.resetMidi = function () {
      this.timeOffset = this.now();
      this.midiData = [];
      this.lastNote = null;
    };

    this.addNote = function (pitch, velocity, currentTime) {
      if (pitch < this.pitchMin || pitch > this.pitchMax) {
        return;
      }
      currentTime = currentTime || this.now();
      if(currentTime - this.lastTime < this.minInterval)
      {
        return;
      }
    
      this.lastTime = currentTime;

      let note = this.noteFromPitch(pitch);

      velocity = 30 + 200 * velocity;
      if (velocity > 127) {
        velocity = 127;
      }
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
          };
          this.midiData.push(newData);
        }
      }

      this.lastNote = note;
    };

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
    this.createMidi = function () {
      let smf = new JZZ.MIDI.SMF(0, this.ppqn);
      let track1 = new JZZ.MIDI.SMF.MTrk();

      track1.add(0, JZZ.MIDI.smfBPM(this.tempo));

      let time1 = 0;
      let time2 = 0;
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
        track1.add(
          time2,
          JZZ.MIDI.noteOff(this.channel, this.midiData[i].name)
        );
      }

      track1.add(time2, JZZ.MIDI.smfEndOfTrack());

      smf.push(track1);

      let str = smf.dump(); // MIDI file dumped as a string
      return JZZ.lib.toBase64(str); // convert to base-64 string
    };

    this.noteFromNumber = function (num, sharps) {
      num = Math.round(num);
      let pcs = sharps === true ? this.noteSharps : this.noteFlats;
      let pc = pcs[num % 12];
      let o = Math.floor(num / 12) - 1;
      return pc + o;
    };

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

    this.fixPitch = function (t0, a, b) {
      if (a) {
        t0 = t0 - b / (2 * a);
      }
      return t0;
    };

    this.loadAudioFile = function (path, callback) {
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

    this.chunkSize = function () {
      /*
            sample per second = 32000
            chunkSize = sampleRate * 60 / (tempo*resolution)
            */
      return (this.sampleRate * 240) / (this.tempo * this.resolution);
    };

    this.getCurrentTime = function (position) {
      return (position * 60000) / (this.tempo * this.sampleRate);
    };

    this.soundToNote = function () {
      this.resetMidi();
      let bSize = this.waveformArray.length;
      let max = bSize - 1;
      let cSize = this.chunkSize();
      let start = 0;
      let end = 0;
      do {
        end = start + cSize;
        if (end > max) {
          end = max;
        }
        let buf = this.waveformArray.slice(start, end);

        let ac = this.autoCorrelate(buf, this.sampleRate);

        if (typeof ac.pitch != "undefined") {
          let currentTime = this.getCurrentTime(start);
          this.addNote(ac.pitch, ac.velocity, currentTime);
        }

        start = end;
      } while (end < max);

      return this;
    };

    let _this = this;
  }
}
