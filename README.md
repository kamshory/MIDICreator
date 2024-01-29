# MIDI Creator

MIDI Creator is a web-based application that can convert sound into MIDI, both sound from files and sound from a microphone directly. MIDI Creator periodically samples the sound, analyzes the frequency, then creates a MIDI notation according to the frequency, volume and duration for that note.

The resulting MIDI is a single channel MIDI. This MIDI can be imported by the DAW application to become a tone pattern which is then combined with other patterns to become a song.

MIDI Creator is very helpful for composers who do not have the ability to play melodic instruments in making notes.


```js
let options = {};
let mc = new MidiCreator(options);
```

## Constructor Parameters

**type `object`**

**properties**

1. name: `tempo` <br />
type: `number` <br />
default value: `130` <br />
description: Tempo or beat per minute

2. name: `ppqn` <br />
type: `number` <br />
default value: `96` <br />
description: Pulses per quarter note

3. name: `maxTempo` <br />
type: `number` <br />
default value: `720` <br />
description: Maximum tempo (for realtime converting only)

4. name: `channel` <br />
type: `number` <br />
default value: `0` <br />
description: Channel number to used

5. name: `pitchMin` <br />
type: `number` <br />
default value: `20` <br />
description: Minimum frequency to be process

6. name: `pitchMax` <br />
type: `number` <br />
default value: `20000` <br />
description: Maximum frequency to be process

7. name: `thresholdRms` <br />
type: `number` <br />
default value: `0.01` <br />
description: Threshold RMS

8. name: `thresholdAmplitude` <br />
type: `number` <br />
default value: `0.2` <br />
description: Threshold amplitude

9. name: `resolution` <br />
type: `number` <br />
default value: `32` <br />
description: Resolution (note per quarter note or note per bar)

10. name: `sampleRate` <br />
type: `number` <br />
default value: `32000` <br />
description: Sample rate (sample per second)

11. name: `minSample` <br />
type: `number` <br />
default value: `500` <br />
description: Minimum sampe fo analize frequancy and amplitude


```js
/** 
 * Process local file
 * 
 * @param {File} file Selected file from emelemnt <input type="file">
 */ 
function processLocalFile(file) 
{
    let mc = new MidiCreator({tempo:75, maxTempo:720, resolution:32, sampleRate:32000, channel:3});
    mc.loadLocalAudioFile(file, function(float32Array){
        mc.soundToNote();
        // true to get raw MIDI data (binary)
        let midiData = mc.createMidi(false);
        window.open('data:audio/midi;base64,'+midiData);
    });
}

/** 
 * Process remote file
 * 
 * @param {String} path Remote path. Application will load the file using AJAX request
 */ 
function processRemoteFile(path)
{
    let mc = new MidiCreator({tempo:75, maxTempo:720, resolution:32, sampleRate:32000, channel:3});
    mc.loadRemoteAudioFile(path, function(float32Array){
        mc.soundToNote();
        // true to get raw MIDI data (binary)
        let midiData = mc.createMidi(false);
        window.open('data:audio/midi;base64,'+midiData);
    });
}
```

MIDI data can be uploaded to server or downloaded as a file.

# Demo

https://planetbiru.com/apps/midi-creator/
