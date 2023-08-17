/**
 * @author: Sam Bellen
 * @description: Draw a waveform from the microphone's audio.
 *               Tested in Chrome and Firefox.
 */

(function () {
  if (!window.AudioContext) {
    setMessage(
      "Your browser does not support window.Audiocontext. This is needed for this demo to work. Please try again in a differen browser."
    );
  }

  // UI Elements
  const messageContainer = document.querySelector(".js-message");
  const canvas = document.querySelector(".js-canvas");
  const recordButton = document.querySelector(".js-record");
  const playButton = document.querySelector(".js-play");
  const audioPlayer = document.querySelector(".js-audio");
  const playButtonIcon = document.querySelector(".js-play .fa");

  // Constants
  const audioContext = new AudioContext();
  const analyser = audioContext.createAnalyser();
  const scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);
  const chunks = [];

  // Variables
  let stream = null;
  let input = null;
  let recorder = null;
  let recording = null;
  let isRecording = false;
  let isPlaying = false;

  // Setup analyser node
  analyser.smoothingTimeConstant = 0.3;
  analyser.fftSize = 1024;

  // Canvas variables
  const barWidth = 2;
  const barGutter = 2;
  const barColor = "#49F1D5";
  let canvasContext = canvas.getContext("2d");
  let bars = [];
  let width = 0;
  let height = 0;
  let halfHeight = 0;
  let drawing = false;

  // Show a message in the UI
  const setMessage = (message) => {
    messageContainer.innerHTML = message;
    messageContainer.classList.add("message--visible");
  };

  // Hide the message
  const hideMessage = () => {
    messageContainer.classList.remove("message--visible");
  };

  // Request access to the user's microphone.
  const requestMicrophoneAccess = () => {
    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(
        (stream) => {
          setAudioStream(stream);
        },
        (error) => {
          setMessage(
            "Something went wrong requesting the userMedia. <br/>Please make sure you're viewing this demo over https."
          );
        }
      );
    } else {
      setMessage(
        "Your browser does not support navigator.mediadevices. <br/>This is needed for this demo to work. Please try again in a differen browser."
      );
    }
  };

  // Set all variables which needed the audio stream
  const setAudioStream = (stream) => {
    stream = stream;
    input = audioContext.createMediaStreamSource(stream);
    recorder = new window.MediaRecorder(stream);

    setRecorderActions();
    setupWaveform();
  };

  // Setup the recorder actions
  const setRecorderActions = () => {
    recorder.ondataavailable = saveChunkToRecording;
    recorder.onstop = saveRecording;
  };

  // Save chunks of the incomming audio to the chuncks array
  const saveChunkToRecording = (event) => {
    chunks.push(event.data);
  };

  // Save the recording
  const saveRecording = () => {
    recording = URL.createObjectURL(
      new Blob(chunks, { type: "audio/ogg; codecs=opus" })
    );
    chunks: [];

    audioPlayer.setAttribute("src", recording);
    playButton.classList.remove("button--disabled");
  };

  // Start recording
  const startRecording = () => {
    isRecording = true;
    recordButton.classList.add("button--active");

    recorder.start();
  };

  // Stop recording
  const stopRecording = () => {
    isRecording = false;
    recordButton.classList.remove("button--active");

    recorder.stop();
  };

  // Toggle the recording button
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Setup the canvas to draw the waveform
  const setupWaveform = () => {
    canvasContext = canvas.getContext("2d");

    width = canvas.offsetWidth;
    height = canvas.offsetHeight;
    halfHeight = canvas.offsetHeight / 2;

    canvasContext.canvas.width = width;
    canvasContext.canvas.height = height;

    input.connect(analyser);
    analyser.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);
    scriptProcessor.onaudioprocess = processInput;
  };

  // Process the microphone input
  const processInput = (audioProcessingEvent) => {
    if (isRecording) {
      const array = new Uint8Array(analyser.frequencyBinCount);

      analyser.getByteFrequencyData(array);
      bars.push(getAverageVolume(array));

      if (bars.length <= Math.floor(width / (barWidth + barGutter))) {
        renderBars(bars);
      } else {
        renderBars(
          bars.slice(bars.length - Math.floor(width / (barWidth + barGutter))),
          bars.length
        );
      }
    } else {
      bars = [];
    }
  };

  // Calculate the average volume
  const getAverageVolume = (array) => {
    const length = array.length;

    let values = 0;
    let i = 0;

    for (; i < length; i++) {
      values += array[i];
    }

    return values / length;
  };

  // Render the bars
  const renderBars = (bars) => {
    if (!drawing) {
      drawing = true;

      window.requestAnimationFrame(() => {
        canvasContext.clearRect(0, 0, width, height);

        bars.forEach((bar, index) => {
          canvasContext.fillStyle = barColor;
          canvasContext.fillRect(
            index * (barWidth + barGutter),
            halfHeight,
            barWidth,
            halfHeight * (bar / 100)
          );
          canvasContext.fillRect(
            index * (barWidth + barGutter),
            halfHeight - halfHeight * (bar / 100),
            barWidth,
            halfHeight * (bar / 100)
          );
        });

        drawing = false;
      });
    }
  };

  // Play the recording
  const play = () => {
    isPlaying = true;

    audioPlayer.play();

    playButton.classList.add("button--active");
    playButtonIcon.classList.add("fa-pause");
    playButtonIcon.classList.remove("fa-play");
  };

  // Stop the recording
  const stop = () => {
    isPlaying = false;

    audioPlayer.pause();
    audioPlayer.currentTime = 0;

    playButton.classList.remove("button--active");
    playButtonIcon.classList.add("fa-play");
    playButtonIcon.classList.remove("fa-pause");
  };

  // Toggle the play button
  const togglePlay = () => {
    if (isPlaying) {
      stop();
    } else {
      play();
    }
  };

  // Setup the audio player
  const setupPlayer = () => {
    audioPlayer.addEventListener("ended", () => {
      stop();
    });
  };

  // Start the application
  requestMicrophoneAccess();
  setupPlayer();

  // Add event listeners to the buttons
  recordButton.addEventListener("mouseup", toggleRecording);
  playButton.addEventListener("mouseup", togglePlay);
})();
