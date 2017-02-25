var SOUND_SOURCES = [
    "sound1.wav",
    "sound2.wav"
];

var audios = [];
var balance = 0;

function loadSound(src) {
    return function (resolve, reject) {
        console.log("Creating <audio> tag for src", src);
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

        audio.src = src;
        audio.loop = true;
        console.log(audio);

        // Well for some darn reason the onload stuff just doesn't seem to work
        setTimeout(function () {
            resolve(audio)
        }, 2500);
    }
}

function updateVolume() {
    var min = 0;
    var max = audios.length - 1;
    var avg = Math.abs(min - max) / 2;
    var midVolume = 0.5;

    audios.forEach(function (audio, index) {
        var diff = index - avg;
        var volume = midVolume + (diff * balance);
        console.log("Volume for index " + index + " is " + volume);
        audio.volume = volume;
    });
}

function start() {
    updateVolume();
    audios.forEach(function (audio) {
        audio.play();
    });
}

function onBalanceChange(value) {
    balance = value;
    updateVolume();
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
        start();
    });

    var slider = document.getElementById("balance");
    slider.addEventListener("input", function () {
        console.log("Slider value is now", slider.value);
        onBalanceChange(slider.value);
    });
}

init();
