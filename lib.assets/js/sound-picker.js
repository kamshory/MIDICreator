/**
 * @author: Sam Bellen
 * @description: Draw a waveform from the microphone's audio.
 *               Tested in Chrome and Firefox.
 *               Source: https://codepen.io/Sambego/pen/VmBJJN
 */
class SoundPicker {
  constructor() {
    // UI Elements
    this.messageContainer = document.querySelector(".js-message");
    this.canvas = document.querySelector(".js-canvas");
    this.recordButton = document.querySelector(".js-record");
    this.playButton = document.querySelector(".js-play");
    this.audioPlayer = document.querySelector(".js-audio");
    this.playButtonIcon = document.querySelector(".js-play .fa");

    // Constants
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.scriptProcessor = this.audioContext.createScriptProcessor(2048, 1, 1);
    this.chunks = [];

    // Variables
    this.stream = null;
    this.input = null;
    this.recorder = null;
    this.recording = null;
    this.isRecording = false;
    this.isPlaying = false;

    this.recordingTime = 0;

    // Setup analyser node
    this.analyser.smoothingTimeConstant = 0.3;
    this.analyser.fftSize = 4096;

    // Canvas variables
    this.barWidth = 2;
    this.barGutter = 2;
    this.barColor = "#49F1D5";
    this.canvasContext = this.canvas.getContext("2d");
    this.bars = [];
    this.width = 0;
    this.height = 0;
    this.halfHeight = 0;
    this.drawing = false;
    this.minRms = 0.002;

    // events
    this.onProcessSample = function (currentTime, pitcInfo) {
    };

    this.onStartRecording = function (sampleRate) {
    };

    this.onStopRecording = function (duration) {
    };

    /**
     * Show a message in the UI
     * @param {string} message 
     */
    this.setMessage = (message) => {
      this.messageContainer.innerHTML = message;
      this.messageContainer.classList.add("message--visible");
    };

    /**
     * Hide the message
     */
    this.hideMessage = () => {
      this.messageContainer.classList.remove("message--visible");
    };

    /**
     * Request access to the user's microphone.
     */
    this.requestMicrophoneAccess = () => {
      if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(
          (stream) => {
            _this.setAudioStream(stream);
          },
          (error) => {
            _this.setMessage(
              "Something went wrong requesting the userMedia. <br/>Please make sure you're viewing this demo over https."
            );
          }
        );
      } else {
        _this.setMessage(
          "Your browser does not support navigator.mediadevices. <br/>This is needed for this demo to work. Please try again in a differen browser."
        );
      }
    };

    /**
     * Set all variables which needed the audio stream
     * @param {MediaStream} stream 
     */
    this.setAudioStream = (stream) => {
      this.input = this.audioContext.createMediaStreamSource(stream);
      this.recorder = new window.MediaRecorder(stream);

      this.setRecorderActions();
      this.setupWaveform();
    };

    /**
     * Setup the recorder actions
     */
    this.setRecorderActions = () => {
      this.recorder.ondataavailable = this.saveChunkToRecording;
      this.recorder.onstop = this.saveRecording;
    };

    /**
     * Save chunks of the incomming audio to the chuncks array
     * @param {Event} event 
     */
    this.saveChunkToRecording = (event) => {
      this.chunks.push(event.data);
    };

    /**
     * Save the recording
     */
    this.saveRecording = () => {
      this.recording = URL.createObjectURL(
        new Blob(this.chunks, { type: "audio/ogg; codecs=opus" })
      );
      this.chunks = [];
      this.audioPlayer.setAttribute("src", this.recording);
      this.playButton.classList.remove("button--disabled");

    };

    /**
     * Start recording
     */
    this.startRecording = () => {
      this.isRecording = true;
      this.recordButton.classList.add("button--active");
      this.recordingTime = (new Date()).getTime();
      this.recorder.start();
      this.onStartRecording(this.audioContext.sampleRate);
    };

    /**
     * Stop recording
     */
    this.stopRecording = () => {
      this.onStopRecording((new Date()).getTime() - this.recordingTime);
      this.isRecording = false;
      this.recordButton.classList.remove("button--active");
      this.recorder.stop();
    };

    /**
     * Toggle the recording button
     */
    this.toggleRecording = () => {
      if (this.isRecording) {
        this.stopRecording();
      } else {
        this.startRecording();
      }
    };

    /**
     * Setup the canvas to draw the waveform
     */
    this.setupWaveform = () => {
      this.canvasContext = this.canvas.getContext("2d");

      this.width = this.canvas.offsetWidth;
      this.height = this.canvas.offsetHeight;
      this.halfHeight = this.canvas.offsetHeight / 2;

      this.canvasContext.canvas.width = this.width;
      this.canvasContext.canvas.height = this.height;

      this.input.connect(this.analyser);
      this.analyser.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);
      this.scriptProcessor.onaudioprocess = this.processInput;
    };

    /**
     * Render the bars
     * @param {Number} time 
     * @param {Array} arr 
     */
    this.processAudioBuffer = function (time, arr) {
      let pitchInfo = this.autoCorrelate(arr, this.audioContext.sampleRate);
      if (pitchInfo.pitch > -1) {
        this.onProcessSample(time - this.recordingTime, pitchInfo);
      }
    };

    /**
     * Get frequency from array sample
     * @param {Float32Array} buffer 
     * @param {Number} sampleRate 
     * @returns 
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
      if (rms < this.minRms) {
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

    /**
     * Process the microphone input
     * @param {AudioProcessingEvent} audioProcessingEvent 
     */
    this.processInput = (audioProcessingEvent) => {
      if (this.isRecording) {
        let inputBuffer = audioProcessingEvent.inputBuffer;
        let inputData = inputBuffer.getChannelData(0);
        this.processAudioBuffer(new Date().getTime(), inputData);

        let array = new Uint8Array(this.analyser.frequencyBinCount);

        this.analyser.getByteFrequencyData(array);
        this.bars.push(this.getAverageVolume(array));

        if (this.bars.length <=
          Math.floor(this.width / (this.barWidth + this.barGutter))) {
          this.renderBars(this.bars);
        } else {
          this.renderBars(
            this.bars.slice(
              this.bars.length -
              Math.floor(this.width / (this.barWidth + this.barGutter))
            ),
            this.bars.length
          );
        }
      } else {
        this.bars = [];
      }
    };

    // Calculate the average volume
    this.getAverageVolume = (array) => {
      let length = array.length;

      let values = 0;
      let i = 0;

      for (; i < length; i++) {
        values += array[i];
      }

      return values / length;
    };

    /**
     * Render the bars
     * @param {Array} barsToRender 
     */
    this.renderBars = (barsToRender) => {
      if (!this.drawing) {
        {
          this.drawing = true;
        }

        window.requestAnimationFrame(() => {
          this.canvasContext.clearRect(0, 0, this.width, this.height);

          barsToRender.forEach((bar, index) => {
            this.canvasContext.fillStyle = this.barColor;
            this.canvasContext.fillRect(
              index * (this.barWidth + this.barGutter),
              this.halfHeight,
              this.barWidth,
              this.halfHeight * (bar / 100)
            );
            this.canvasContext.fillRect(
              index * (this.barWidth + this.barGutter),
              this.halfHeight - this.halfHeight * (bar / 100),
              this.barWidth,
              this.halfHeight * (bar / 100)
            );
          });

          this.drawing = false;
        });
      }
    };

    /**
     * Play the recording
     */
    this.play = () => {
      this.isPlaying = true;

      this.audioPlayer.play();

      this.playButton.classList.add("button--active");
      this.playButtonIcon.classList.add("fa-pause");
      this.playButtonIcon.classList.remove("fa-play");
    };

    /**
     * Stop the recording
     */
    this.stop = () => {
      this.isPlaying = false;

      this.audioPlayer.pause();
      this.audioPlayer.currentTime = 0;

      this.playButton.classList.remove("button--active");
      this.playButtonIcon.classList.add("fa-play");
      this.playButtonIcon.classList.remove("fa-pause");
    };

    /**
     * Toggle the play button
     */
    this.togglePlay = () => {
      if (this.isPlaying) {
        this.stop();
      } else {
        this.play();
      }
    };

    /**
     * Setup the audio player
     */
    this.setupPlayer = () => {
      this.audioPlayer.addEventListener("ended", () => {
        this.stop();
      });
    };

    /**
     * Start the application
     */
    this.requestMicrophoneAccess();

    /**
     * Setup player
     */
    this.setupPlayer();

    // Add event listeners to the buttons
    this.recordButton.addEventListener("mouseup", this.toggleRecording);
    this.playButton.addEventListener("mouseup", this.togglePlay);

    let _this = this;
  }
}
