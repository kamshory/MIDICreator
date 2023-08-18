let audioPicker;
let midiCreator;
let tempo = 80;
let maxTempo = 720;
let resolution = 32;
let channel = 3;
let sampleRate = 32000;

window.onload = function () {
  let elem = document.querySelector(".piano-roll");
  audioPicker = new SoundPicker();
  audioPicker.onStartRecording = function (sampleRate) {
    console.log("start recording");
    midiCreator = new MidiCreator({
      tempo: tempo,
      maxTempo: maxTempo,
      resolution: resolution,
      sampleRate: sampleRate,
      channel: channel
    });
    midiCreator.onPreviewNote = function (data) {
      let elems = elem.querySelectorAll(".note-on");
      if (elems != null) {
        for (let i = 0; i < elems.length; i++) {
          elems[i].classList.remove("note-on");
        }
      }
      let tut = elem.querySelector('[data-index="' + data.midi + '"]');
      if (tut != null) {
        tut.classList.add("note-on");
      }
    };
  };
  audioPicker.onStopRecording = function (duration) {
    console.log("stop recording ", duration);
    let midiData = midiCreator.createMidi();
    window.open("data:audio/midi;base64," + midiData);
  };
  audioPicker.onProcessSample = function (time, pitcInfo) {
    midiCreator.addNote(pitcInfo.pitch, pitcInfo.velocity, time);
  };

  createPianoRoll(elem);

  let dropArea = document.querySelector(".button--open");
  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    dropArea.addEventListener(eventName, preventDefaults, false);
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    dropArea.addEventListener(eventName, highlight, false);
  });
  ["dragleave", "drop"].forEach((eventName) => {
    dropArea.addEventListener(eventName, unhighlight, false);
  });
  dropArea.addEventListener("drop", handleDrop, false);
  dropArea.addEventListener("click", handleClick, false);
  document.querySelector('#localfile').addEventListener('change', function(e){
    handleFiles(e.target.files);
  });
};

function highlight(e) {
  e.target.classList.add("highlight");
}

function unhighlight(e) {
  e.target.classList.remove("highlight");
}
function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}
function handleClick(e)
{
    document.querySelector('#localfile').click();
}
function handleDrop(e) {
  let dt = e.dataTransfer;
  let files = dt.files;

  handleFiles(files);
}
function handleFiles(files) {
  [...files].forEach(processLocalFile);
}

function processLocalFile(file) {
    let mc = new MidiCreator({
      tempo: tempo,
      maxTempo: maxTempo,
      resolution: resolution,
      channel: channel,
      sampleRate: sampleRate,
    });

    mc.loadLocalAudioFile(file, function(float32Array){
      mc.soundToNote();     
      JZZ.synth.Tiny.register('Web Audio');     
      var player = new JZZ.gui.Player('player');
      var data = mc.createMidi(true);
      player.load(new JZZ.MIDI.SMF(data));
      player.play();   
      let midiData = JZZ.lib.toBase64(data);
      window.open('data:audio/midi;base64,'+midiData);
    });
}

function processRemoteFile(path)
{
    let mc = new MidiCreator({
      tempo: tempo,
      maxTempo: maxTempo,
      resolution: resolution,
      channel: channel,
      sampleRate: sampleRate,
    });
    
    mc.loadRemoteAudioFile(path, function(float32Array){
      mc.soundToNote();     
      JZZ.synth.Tiny.register('Web Audio');     
      var player = new JZZ.gui.Player('player');
      var data = mc.createMidi(true);
      player.load(new JZZ.MIDI.SMF(data));
      player.play();   
      let midiData = JZZ.lib.toBase64(data);
      window.open('data:audio/midi;base64,'+midiData);
    });
}


function createPianoRoll(elem) {
  let factor = 16;
  let min = 12;
  let max = 132;
  elem.style.width = Math.floor((max - min) / 12) * 7 * factor + "px";
  for (let i = min; i < max; i++) {
    let tuts = document.createElement("div");
    let mod = i % 12;
    let octave = Math.floor((i - min) / 12);
    let key = inf[mod];
    if (key.type == 1) {
      tuts.className = "tuts tuts-white";
      let j = i;
      tuts.setAttribute("data-index", i);
      tuts.style.left = octave * 7 * factor + key.offset * factor + "px";
      tuts.style.width = key.width * factor + "px";
      elem.appendChild(tuts);
    }
  }
  for (let i = min; i < max; i++) {
    let tuts = document.createElement("div");
    let mod = i % 12;
    let octave = Math.floor((i - min) / 12);
    let key = inf[mod];
    if (key.type == 2) {
      tuts.className = "tuts tuts-black";
      let j = i;
      tuts.setAttribute("data-index", i);
      tuts.style.left = octave * 7 * factor + key.offset * factor + "px";
      tuts.style.width = key.width * factor + "px";
      elem.appendChild(tuts);
    }
  }
}
function tutsKey(index) {
  let mod = index % 12;
}
let inf = [
  {
    type: 1,
    offset: 0,
    width: 1,
  },
  {
    type: 2,
    offset: 0.5,
    width: 0.8,
  },
  {
    type: 1,
    offset: 1,
    width: 1,
  },
  {
    type: 2,
    offset: 1.7,
    width: 0.8,
  },
  {
    type: 1,
    offset: 2,
    width: 1,
  },
  {
    type: 1,
    offset: 3,
    width: 1,
  },
  {
    type: 2,
    offset: 3.5,
    width: 0.8,
  },
  {
    type: 1,
    offset: 4,
    width: 1,
  },
  {
    type: 2,
    offset: 4.6,
    width: 0.8,
  },
  {
    type: 1,
    offset: 5,
    width: 1,
  },
  {
    type: 1,
    offset: 6,
    width: 1,
  },
  {
    type: 2,
    offset: 5.7,
    width: 0.8,
  },
];
