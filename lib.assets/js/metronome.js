function Metronome(bpm, beats, beatType)
{
    this.bpm = bpm;
    this.interval = null;
    this.beats = beats;
    this.beatType = beatType;
    this.count = 0;
    this.isOn = false;
    
    this.audioContext = new AudioContext();

    this.hit = function()
    {
        let end = false;
        this.count++;
        let count = this.count;
        if(this.count == this.beats)
        {
            this.count = 0;
            end = true;
        }
        let timeInterval = 60000 / (this.bpm * 4);
        let freq = end ? 300 : 200;
        this.beep(timeInterval, freq, 0.6);
    }

    
    this.init = function()
    {
    }
    
    /**
     * Helper function to emit a beep sound in the browser using the Web Audio API.
     * 
     * @param {number} duration - The duration of the beep sound in milliseconds.
     * @param {number} frequency - The frequency of the beep sound.
     * @param {number} volume - The volume of the beep sound.
     * 
     * @returns {Promise} - A promise that resolves when the beep sound is finished.
     */
    this.beep = function(duration, frequency, volume){
        return new Promise((resolve, reject) => {
            try{
                let oscillatorNode = obj.audioContext.createOscillator();
                let gainNode = obj.audioContext.createGain();
                oscillatorNode.connect(gainNode);

                // Set the oscillator frequency in hertz
                oscillatorNode.frequency.value = frequency;

                // Set the type of oscillator
                oscillatorNode.type = "square";
                gainNode.connect(obj.audioContext.destination);

                // Set the gain to the volume
                gainNode.gain.value = volume * 0.01;

                // Start audio with the desired duration
                oscillatorNode.start(obj.audioContext.currentTime);
                oscillatorNode.stop(obj.audioContext.currentTime + duration * 0.001);

                // Resolve the promise when the sound is finished
                oscillatorNode.onended = () => {
                    resolve();
                };
            }catch(error){
                reject(error);
            }
        });
    }
    
    this.start = function()
    {
        let timeInterval = 60000 / (this.bpm);
        obj.hit();
        this.interval = setInterval(function(){
            obj.hit();
        }, timeInterval)
    }
    let obj = this;
    this.init();
}