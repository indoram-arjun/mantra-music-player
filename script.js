const player = document.querySelector(".music-player");
const audio = document.getElementById("audio");
const playButton = document.getElementById("playButton");
const stopButton = document.getElementById("stopButton");
const autoPlayButton = document.getElementById("autoPlayButton");
const playIcon = playButton.querySelector("span");
const progress = document.getElementById("progress");
const volume = document.getElementById("volume");
const trackName = document.getElementById("trackName");
const currentTimeLabel = document.getElementById("currentTime");
const durationLabel = document.getElementById("duration");
const statusLabel = document.getElementById("status");
const counterPanel = document.getElementById("counterPanel");
const counterMessage = document.getElementById("counterMessage");
const counterFill = document.getElementById("counterFill");
const playCountLabel = document.getElementById("playCount");
const resetCounterButton = document.getElementById("resetCounterButton");
const installButton = document.getElementById("installButton");

const TARGET_PLAY_COUNT = 108;
const COUNTER_STORAGE_KEY = "mantraPlayerPlayCount";
const audioSourceName = audio.getAttribute("src") || "audio file";

let playCount = loadPlayCount();
let isSeeking = false;
let isAutoMode = false;
let deferredInstallPrompt = null;

trackName.textContent = audioSourceName;

function loadPlayCount() {
    try {
        const savedCount = Number(localStorage.getItem(COUNTER_STORAGE_KEY));

        return Number.isInteger(savedCount) && savedCount >= 0 ? savedCount : 0;
    } catch (error) {
        return 0;
    }
}

function savePlayCount() {
    try {
        localStorage.setItem(COUNTER_STORAGE_KEY, String(playCount));
    } catch (error) {
        return;
    }
}

function updateCounter() {
    const cappedCount = Math.min(playCount, TARGET_PLAY_COUNT);
    const percent = (cappedCount / TARGET_PLAY_COUNT) * 100;
    const isComplete = playCount >= TARGET_PLAY_COUNT;

    playCountLabel.textContent = String(playCount);
    counterFill.style.width = `${percent}%`;
    counterPanel.classList.toggle("is-complete", isComplete);
    counterMessage.textContent = isComplete
        ? "108 plays complete"
        : `${playCount} of 108 plays complete`;
}

function incrementPlayCount() {
    playCount += 1;
    savePlayCount();
    updateCounter();
}

function updateAutoButton() {
    autoPlayButton.classList.toggle("is-active", isAutoMode);
    autoPlayButton.setAttribute("aria-pressed", String(isAutoMode));
    autoPlayButton.textContent = isAutoMode ? "Auto On" : "Auto 108";
}

function setAutoMode(isEnabled) {
    isAutoMode = isEnabled;
    updateAutoButton();
}

function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) {
        return "0:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");

    return `${minutes}:${remainingSeconds}`;
}

function setProgressFill() {
    const max = Number(progress.max) || 100;
    const value = Number(progress.value) || 0;
    const percent = Math.min((value / max) * 100, 100);

    progress.style.setProperty("--progress-fill", `${percent}%`);
}

function setVolumeFill() {
    volume.style.setProperty("--volume-fill", `${Number(volume.value) * 100}%`);
}

function setStatus(message) {
    statusLabel.textContent = message;
}

function setControlsEnabled(isEnabled) {
    playButton.disabled = !isEnabled;
    stopButton.disabled = !isEnabled;
    autoPlayButton.disabled = !isEnabled;
    volume.disabled = !isEnabled;
    progress.disabled = !isEnabled || !Number.isFinite(audio.duration);
}

function setInstallButtonVisible(isVisible) {
    installButton.hidden = !isVisible;
}

function updatePlayButton() {
    const isPlaying = !audio.paused && !audio.ended;

    playButton.classList.toggle("is-playing", isPlaying);
    playButton.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
    playIcon.textContent = isPlaying ? "II" : "\u25b6";
}

function updateTimeLabels() {
    currentTimeLabel.textContent = formatTime(audio.currentTime);
    durationLabel.textContent = formatTime(audio.duration);
}

function resetTrack() {
    audio.pause();
    audio.currentTime = 0;
    progress.value = 0;
    currentTimeLabel.textContent = "0:00";
    setProgressFill();
    updatePlayButton();
}

async function playAudio() {
    try {
        await audio.play();
        return true;
    } catch (error) {
        setStatus(`Unable to play ${audioSourceName}`);
        return false;
    }
}

async function togglePlayback() {
    if (audio.paused || audio.ended) {
        await playAudio();
        return;
    }

    setAutoMode(false);
    audio.pause();
}

function showAudioError() {
    setAutoMode(false);
    resetTrack();
    player.classList.add("is-error");
    setControlsEnabled(false);
    setStatus(`Add ${audioSourceName} beside index.html to enable playback.`);
}

async function registerOfflineApp() {
    if (!("serviceWorker" in navigator) || window.location.protocol === "file:") {
        return;
    }

    try {
        const registration = await navigator.serviceWorker.register("sw.js");
        await navigator.serviceWorker.ready;

        if (!audio.paused || audio.currentTime > 0) {
            return;
        }

        setStatus(registration.active ? "Offline ready" : "Preparing offline mode");
    } catch (error) {
        setStatus("Offline install needs a local server or HTTPS");
    }
}

audio.volume = Number(volume.value);
updateCounter();
updateAutoButton();
setVolumeFill();
setProgressFill();

audio.addEventListener("loadedmetadata", () => {
    progress.max = audio.duration;
    progress.disabled = false;
    updateTimeLabels();
    setProgressFill();
    setStatus("Ready to play");
});

audio.addEventListener("canplay", () => {
    player.classList.remove("is-error");
    setControlsEnabled(true);
});

audio.addEventListener("play", () => {
    updatePlayButton();
    setStatus(isAutoMode ? `Auto 108: play ${Math.min(playCount + 1, TARGET_PLAY_COUNT)} of 108` : "Playing");
});

audio.addEventListener("pause", () => {
    updatePlayButton();

    if (!audio.ended && audio.currentTime > 0) {
        setStatus("Paused");
    }
});

audio.addEventListener("ended", async () => {
    incrementPlayCount();

    if (playCount >= TARGET_PLAY_COUNT) {
        setAutoMode(false);
        resetTrack();
        setStatus("108 plays complete");
        return;
    }

    if (isAutoMode) {
        resetTrack();
        setStatus(`Auto 108: starting play ${playCount + 1} of 108`);
        await playAudio();
        return;
    }

    resetTrack();
    setStatus(`Play ${playCount} of 108 complete`);
});

audio.addEventListener("timeupdate", () => {
    if (!isSeeking) {
        progress.value = audio.currentTime;
        setProgressFill();
    }

    updateTimeLabels();
});

audio.addEventListener("error", showAudioError);

playButton.addEventListener("click", togglePlayback);

stopButton.addEventListener("click", () => {
    setAutoMode(false);
    resetTrack();
    setStatus("Stopped");
});

autoPlayButton.addEventListener("click", async () => {
    if (isAutoMode) {
        setAutoMode(false);
        setStatus("Auto 108 stopped");
        return;
    }

    if (playCount >= TARGET_PLAY_COUNT) {
        setStatus("Counter is already 108. Reset to start Auto 108 again.");
        return;
    }

    setAutoMode(true);

    if (audio.ended) {
        audio.currentTime = 0;
    }

    const didStart = await playAudio();

    if (!didStart) {
        setAutoMode(false);
    }
});

progress.addEventListener("input", () => {
    isSeeking = true;
    audio.currentTime = Number(progress.value);
    currentTimeLabel.textContent = formatTime(audio.currentTime);
    setProgressFill();
});

progress.addEventListener("change", () => {
    isSeeking = false;
    audio.currentTime = Number(progress.value);
});

volume.addEventListener("input", () => {
    audio.volume = Number(volume.value);
    setVolumeFill();
});

resetCounterButton.addEventListener("click", () => {
    playCount = 0;
    savePlayCount();
    updateCounter();
    setStatus("108 counter reset");
});

window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    setInstallButtonVisible(true);
});

window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    setInstallButtonVisible(false);
    setStatus("Installed for offline use");
});

installButton.addEventListener("click", async () => {
    if (!deferredInstallPrompt) {
        setStatus("Install option is available from the browser menu");
        return;
    }

    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;

    if (choice.outcome === "accepted") {
        setInstallButtonVisible(false);
    }

    deferredInstallPrompt = null;
});

setControlsEnabled(true);
audio.load();
registerOfflineApp();
