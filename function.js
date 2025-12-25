const context = new (window.AudioContext || window.webkitAudioContext)();
let isRecording = false;
let stream = null;
let animationId = null;
let analyser = null;
let dataArray = null;

const BLOW_THRESHOLD = 70; // kept for other uses

const startButton = document.getElementById('startButton');
const volumeBar = document.getElementById('volumeBar');
const video = document.getElementById('video') || document.querySelector('.video video');
let originalSrc = null;
let blowPlaying = false;

async function startMeasuringVolume() {
    if (!isRecording) {
        await startRecording();
    } else {
        stopRecording();
    }
}

async function startRecording() {
    try {
        if (context.state === 'suspended') await context.resume();
        const newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream = newStream;

        const source = context.createMediaStreamSource(newStream);
        analyser = context.createAnalyser();
        analyser.fftSize = 2048;
        dataArray = new Uint8Array(analyser.fftSize);
        source.connect(analyser);

        isRecording = true;
        updateLoop();
    } catch (err) {
        console.error('Error starting recording:', err);
    }
}

function updateLoop() {
    if (!analyser || !dataArray) return;
    analyser.getByteTimeDomainData(dataArray);
    // compute RMS (root mean square) as volume estimate
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        const v = (dataArray[i] - 128) / 128; // -1..1
        sum += v * v;
    }
    const rms = Math.sqrt(sum / dataArray.length); // 0..1
    const level = Math.min(100, Math.round(rms * 200)); // heuristic mapping to 0-100

    if (volumeBar) {
        if (volumeBar.classList.contains('circle')) {
            volumeBar.style.transform = `translate(-50%, -50%) scale(${rms})`;
        } else {
            volumeBar.style.width = `${level}%`;
        }
    }

    // Trigger blow animation/video when level meets or exceeds threshold
    if (!blowPlaying && level >= BLOW_THRESHOLD) {
        triggerAnimation(level);
    }

    animationId = requestAnimationFrame(updateLoop);
}

function stopRecording() {
    try {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
    } catch (e) { /* ignore */ }
    if (animationId) cancelAnimationFrame(animationId);
    animationId = null;
    analyser = null;
    dataArray = null;
    isRecording = false;
    if (volumeBar) {
        if (volumeBar.classList.contains('circle')) {
            volumeBar.style.transform = 'translate(-50%, -50%) scale(0)';
        } else {
            volumeBar.style.width = '0%';
        }
    }
}

(function init(){
    if (startButton) startButton.addEventListener('click', startMeasuringVolume);
})();

function appear(startButton, i, step, speed){
    var t_o;
    //initial opacity
    i = i || 0;
    //opacity increment
    step = step || 5;
    //time waited between two opacity increments in msec
    speed = speed || 50; 

    t_o = setInterval(function(){
        //get opacity in decimals
        var opacity = i / 100;
        //set the next opacity step
        i = i + step; 
        if(opacity > 1 || opacity < 0){
            clearInterval(t_o);
            //if 1-opaque or 0-transparent, stop
            return; 
        }
        //modern browsers
        startButton.style.opacity = opacity;
        //older IE
        startButton.style.filter = 'alpha(opacity=' + opacity*100 + ')';
    }, speed);
}

appear(document.getElementsByTagName('startButton')[0], 0, 5, 40);

// triggerAnimation left as a helper if needed elsewhere
function triggerAnimation(volume){
    if (!video) return;
    if (volume < BLOW_THRESHOLD) return;
    if (blowPlaying) return;

    // Save original source if not saved
    if (!originalSrc) {
        const srcEl = video.querySelector('source');
        originalSrc = (srcEl && srcEl.getAttribute('src')) || video.currentSrc || video.src || '';
    }

    blowPlaying = true;
    // Play the blow video once, unmuted
    try {
        video.pause();
        video.muted = false;
        video.loop = false;
        video.src = 'cakeburntout.mp4';
        video.load();
        const playPromise = video.play();
        if (playPromise && playPromise.catch) playPromise.catch(() => {});
    } catch (e) {
        console.error('Error starting blow video:', e);
        blowPlaying = false;
        return;
    }

    // When blow video ends, pause on its last frame (do not revert to original)
    const onEnded = () => {
        try {
            video.removeEventListener('ended', onEnded);
            // Pause and set currentTime to just before the end to keep the last frame visible
            video.pause();
            try {
                // Some browsers may throw if duration is not available immediately
                video.currentTime = Math.max(0, video.duration - 0.05);
            } catch (err) { /* ignore timing errors */ }
            // keep it unmuted and not looping so the final frame stays displayed with sound off/on as played
        } catch (e) { console.error('Error finalizing blow video:', e); }
        // leave blowPlaying true to avoid immediate retrigger; set to false if retrigger should be allowed
    };
    video.addEventListener('ended', onEnded);
}


function openTest() {
    document.getElementById("test").style.display = "block";
}