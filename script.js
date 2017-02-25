// Sound files to use as sources, haven't tested with anything but 2, though
// the logic sort of supports more or less.
var SOUND_SOURCES = [
    "sound1.mp3",
    "sound2.mp3"
];

// Balance of audio files, -1 for first sound only, 1 for second only
var balanceLevel = -1;

// Simply the overall volume level
var masterVolume = 0.2;

// Time to transition between fades
var transitionDuration = 5000;

// How many steps should transitioning be done
var transitionSteps = 60;

// Chrome can't do gapless looping with `loop=true` for some reason, but what
// you can try is a little before the sound ends you restart it from scratch.
// Finding the proper value for your audio clips likely will take some
// experimentation, but this worked for me on clips with 0 gap in Audacity.
//
// It's also a bit unstable thanks to JS setTimeout being imprecise.
var gaplessBuffer = .035;

// ----- END CONFIG ----- //

var Slider = {
    create: function (id, value) {
        var _this = Object.create(this);
        _this.initialize(id, value);
        return _this;
    },

    transitionTo: function (value, duration) {
        var _this = this;

        if (this._transition !== null) {
            console.log("Aborting previous transition");
            clearInterval(this._transition);
            this._transition = null;
        }

        var current = this.get();
        var direction = value - current;

        if (direction === 0) {
            console.log("No transition necessary");
            return;
        }

        var currentStep = 0;
        var diff = this._max - this._min;
        var msPerStep = duration / transitionSteps;

        var valuePerStep = diff / transitionSteps;
        if (direction < 0) {
            valuePerStep *= -1;
        }


        console.log("Transitioning " + this.id + " from " + current + " to " + value + " in " + duration + "ms");
        console.log("Stepping every " + Math.round(msPerStep) + "ms with " + valuePerStep.toFixed(2) + " change per step");

        function getNext(current) {
            var next = current + valuePerStep;

            if (direction < 0) {
                if (next < value) {
                    next = value;
                }
            } else {
                if (next > value) {
                    next = value;
                }
            }

            return next;
        }

        function done() {
            console.log("Transition done");
            clearInterval(_this._transition);
            _this._transition = null;
        }

        function step() {
            return setTimeout(function () {
                currentStep++;
                _this.set(next);
                if (currentStep > transitionSteps || next == value) {
                    done();
                } else {
                    next = getNext(next);
                }
            }, msPerStep);
        }

        var next = getNext(current);
        this._transition = setInterval(step, msPerStep);
    },

    initialize: function (id, value) {
        this.id = id;
        this.value = value;
        this._transition = null;
        this._element = document.getElementById(id);
        this._element.value = value;
        this._element.addEventListener("input", this._onInput.bind(this));
        this._min = Number(this._element.min);
        this._max = Number(this._element.max);
    },

    get: function () {
        return Number(this.value);
    },

    set: function (value, fromElement) {
        value = Number(value);
        if (value > this._max) {
            value = this._max;
        } else if (value < this._min) {
            value = this._min;
        }

        console.log("Slider " + this.id + " value is now", value.toFixed(2));

        if (!fromElement) {
            this._element.value = value;
        } else if (this._transition !== null) {
            console.log("Manual intervention, stopping transition");
            clearInterval(this._transition);
            this._transition = null;
        }

        this.value = value;
        this.onUpdate();
    },

    onUpdate: function () {

    },

    _onInput: function (event) {
        this.set(this._element.value, true);
    }
};


var balance = Slider.create("balance", balanceLevel);
var volume = Slider.create("volume", masterVolume);
var play = document.getElementById("play");
var stop = document.getElementById("stop");
var t1 = document.getElementById("t1");
var t2 = document.getElementById("t2");

var audios = [];
var timeouts = [];

/**
 * Set up a permanent looping timeout on the audio -tag, as `loop=true` doesn't
 * actually work properly.
 *
 * @param audio Audio
 */
function loop(audio) {
    var remainder = audio.duration - gaplessBuffer;
    var id = setTimeout(function () {
        console.log("Looping at " + audio.currentTime + "s mark");

        // Remove this id from the active timeouts
        var i = timeouts.indexOf(id);
        if (i > -1) {
            timeouts.splice(i, 1);
        }

        audio.currentTime = 0;
        audio.play();
    }, remainder * 1000);

    timeouts.push(id);
}

/**
 * Returns a promise handler
 * @param src
 * @returns {Function}
 */
function loadSound(src) {
    return function (resolve, reject) {
        console.log("Creating <audio> tag for", src);

        var audio = new Audio();

        audio.addEventListener('oncanplaythrough', function () {
            resolve(audio)
        });

        audio.onload = function () {
            resolve(audio);
        };

        audio.addEventListener('error', function (e) {
            console.log("Couldn't load audio", e);
            reject();
        });

        audio.addEventListener("play", function () {
            console.log(src, "playing, registering loop");
            loop(audio);
        });

        audio.addEventListener("seeked", function () {
            console.log(src, "seeked, registering loop");
            loop(audio);
        });

        audio.src = src;

        // Well for some darn reason the onload stuff just doesn't seem to work
        setTimeout(function () {
            resolve(audio)
        }, 500);
    }
}

function updateVolume() {
    var min = 0;
    var max = audios.length - 1;
    var avg = Math.abs(min - max) / 2;
    var midVolume = 0.5;
    var balanceLevel = balance.get();
    var masterVolume = volume.get();

    audios.forEach(function (audio, index) {
        var diff = index - avg;
        var volume = (midVolume + (diff * balanceLevel)) * masterVolume;

        if (volume > 1) {
            volume = 1;
        } else if (volume < 0) {
            volume = 0;
        }

        // console.log("Volume for index " + index + " is " + volume);
        audio.volume = volume;
    });
}

function playAudio() {
    console.log("Play");
    updateVolume();
    audios.forEach(function (audio) {
        audio.currentTime = 0;
        audio.play();
    });
}

function stopAudio() {
    console.log("Stop");
    timeouts.forEach(function (id) {
        clearTimeout(id);
    });
    audios.forEach(function (audio) {
        audio.pause();
        audio.currentTime = 0;
    });
}

function init() {
    console.log("Initializing");
    var promises = [];

    SOUND_SOURCES.forEach(function (src) {
        console.log("Preloading ", src);
        var p = new Promise(loadSound(src));
        p.then(function (audio) {
            console.log("Loaded ", src);
            audios.push(audio);
        });
        promises.push(p);
    });

    var all = Promise.all(promises);
    all.then(function () {
        console.log("All sources loaded");
        play.disabled = false;
    });

    play.addEventListener("click", playAudio);
    stop.addEventListener("click", stopAudio);
    t1.addEventListener("click", function () {
        balance.transitionTo(-1, transitionDuration);
    });
    t2.addEventListener("click", function () {
        balance.transitionTo(1, transitionDuration);
    });

    balance.onUpdate = updateVolume;
    volume.onUpdate = updateVolume;
}

init();
