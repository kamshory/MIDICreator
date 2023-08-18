# MIDI Creator

MIDI Creator is a web-based application that can convert sound into MIDI, both sound from files and sound from a microphone directly. MIDI Creator periodically samples the sound, analyzes the frequency, then creates a MIDI notation according to the frequency, volume and duration for that note.

The resulting MIDI is a single channel MIDI. This MIDI can be imported by the DAW application to become a tone pattern which is then combined with other patterns to become a song.

MIDI Creator is very helpful for composers who do not have the ability to play melodic instruments in making notes.


```js
/** 
 * Process local file
 * 
 * @param {File} file Selected file from emelemnt <input type="file">
 */ 
function processLocalFile(file) {
    let mc = new MidiCreator({tempo:75, maxTempo:720, resolution:32, sampleRate:32000, channel:3});
    mc.loadLocalAudioFile(file, function(float32Array){
        mc.soundToNote();
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
        let midiData = mc.createMidi();
        window.open('data:audio/midi;base64,'+midiData);
    });
}
```
