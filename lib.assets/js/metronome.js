function Metronome(selector, bpm, beats, beatType)
{
    this.bpm = bpm;
    this.interval = null;
    this.beats = beats;
    this.beatType = beatType;
    this.count = 0;
    this.isOn = false;
    this.selector = selector;
    this.sounds = [];
    this.volume = 0.2;
    
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
        //this.beep(timeInterval, freq, 0.6);
        let arr = this.selector.querySelectorAll('span');
        for(let i = 0; i<arr.length; i++)
        {
            if(arr[i].classList.contains('on'))
            {
                arr[i].classList.remove('on');
            }
        }
        this.selector.setAttribute('data-step', this.count);
        this.selector.querySelector('span[data-index="'+(this.count)+'"]').classList.add('on');
        this.sounds[this.count].play();
    }

    
    this.init = function()
    {
        this.selector.innerHTML = "";
        this.selector.classList.add('metronome-pie-'+this.beats+'-'+this.beatType)
        for(let i = 1; i<=this.beats; i++)
        {
            let j = i;
            if(j == this.beats)
            {
                j = 0;
            }
            let span = document.createElement('span');
            span.setAttribute('data-index', j);
            span.setAttribute('class', 'normal');
            span.innerText = i;
            this.selector.appendChild(span);
            
            let au = '';
            if(j == 1)
            {
                au = 'lib.assets/sounds/metronome-end.mp3';
            }
            else
            {
                au = 'lib.assets/sounds/metronome-first.mp3';
            }
            let audio = new Audio(au);
            audio.volume = this.volume;
            this.sounds.push(audio); 
            
        }
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