// ============================================================
// GLOBAL MUSIC PLAYER
// Works across all pages/tabs of the same website
// ============================================================

let playlistQueue = [];
let currentTrackIndex = 0;

const masterPlayer = document.getElementById("global-player");
const statusDisplay = document.getElementById("now-playing");

const STORAGE_KEY = "globalMusicQueue";
const INDEX_KEY = "globalMusicIndex";
const PLAYING_KEY = "globalMusicPlaying";

// Communication between pages/tabs
const playerChannel = new BroadcastChannel("global_music_player");


// ============================================================
// LOAD SAVED QUEUE
// ============================================================

function loadQueue() {
    const savedQueue = localStorage.getItem(STORAGE_KEY);
    const savedIndex = localStorage.getItem(INDEX_KEY);

    if (savedQueue) {
        try {
            playlistQueue = JSON.parse(savedQueue);
        } catch (error) {
            playlistQueue = [];
        }
    }

    if (savedIndex !== null) {
        currentTrackIndex = parseInt(savedIndex);
    }
}


// ============================================================
// SAVE QUEUE
// ============================================================

function saveQueue() {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(playlistQueue)
    );

    localStorage.setItem(
        INDEX_KEY,
        currentTrackIndex
    );
}


// ============================================================
// SEND MESSAGE TO OTHER PAGES
// ============================================================

function notifyPages(type) {

    playerChannel.postMessage({
        type: type,
        queue: playlistQueue,
        index: currentTrackIndex
    });
}


// ============================================================
// PLAY A TRACK
// ============================================================

function executeTrack(index, notify = true) {

    if (
        playlistQueue.length === 0 ||
        index < 0 ||
        index >= playlistQueue.length
    ) {
        return;
    }

    currentTrackIndex = index;

    const currentSong =
        playlistQueue[currentTrackIndex];

    // Save current position in queue
    saveQueue();

    // Tell other pages to stop their players
    if (notify) {
        playerChannel.postMessage({
            type: "START_PLAYING",
            queue: playlistQueue,
            index: currentTrackIndex,
            song: currentSong
        });
    }

    // Load song
    masterPlayer.src = currentSong.url;

    statusDisplay.textContent =
        `Now Playing: ${currentSong.title}`;

    // Remember that music is playing
    localStorage.setItem(
        PLAYING_KEY,
        "true"
    );

    masterPlayer.play().catch(() => {

        statusDisplay.textContent =
            `Click Play to listen to: ${currentSong.title}`;

    });
}


// ============================================================
// PLAY NOW
// ============================================================

function playNow(title, url) {

    const song = {
        title: title,
        url: url
    };

    // Clear everything
    playlistQueue = [song];

    currentTrackIndex = 0;

    saveQueue();

    localStorage.setItem(
        PLAYING_KEY,
        "true"
    );

    // Tell other pages to stop
    playerChannel.postMessage({
        type: "START_PLAYING",
        queue: playlistQueue,
        index: 0,
        song: song
    });

    executeTrack(0, false);
}


// ============================================================
// PLAY NEXT
// ============================================================

function playNext(title, url) {

    const song = {
        title: title,
        url: url
    };

    // If queue is empty
    if (playlistQueue.length === 0) {

        playlistQueue.push(song);

        currentTrackIndex = 0;

        saveQueue();

        executeTrack(0);

        return;
    }

    // Insert directly after currently playing song
    playlistQueue.splice(
        currentTrackIndex + 1,
        0,
        song
    );

    saveQueue();

    // Tell other pages about queue change
    playerChannel.postMessage({
        type: "QUEUE_UPDATED",
        queue: playlistQueue,
        index: currentTrackIndex
    });

    statusDisplay.textContent =
        `Added next: ${title}`;
}


// ============================================================
// ADD TO END OF QUEUE
// ============================================================

function addToQueue(title, url) {

    const song = {
        title: title,
        url: url
    };

    playlistQueue.push(song);

    saveQueue();

    // Tell other pages
    playerChannel.postMessage({
        type: "QUEUE_UPDATED",
        queue: playlistQueue,
        index: currentTrackIndex
    });


    // If nothing is currently playing
    if (
        !masterPlayer.src ||
        masterPlayer.paused
    ) {

        executeTrack(
            playlistQueue.length - 1
        );

    } else {

        statusDisplay.textContent =
            `Queued: ${title}`;
    }
}


// ============================================================
// WHEN SONG ENDS
// ============================================================

masterPlayer.addEventListener(
    "ended",
    () => {

        if (
            currentTrackIndex + 1 <
            playlistQueue.length
        ) {

            executeTrack(
                currentTrackIndex + 1
            );

        } else {

            localStorage.setItem(
                PLAYING_KEY,
                "false"
            );

            statusDisplay.textContent =
                "Playlist queue completed.";

            playerChannel.postMessage({
                type: "QUEUE_FINISHED"
            });
        }
    }
);


// ============================================================
// RECEIVE MESSAGES FROM OTHER PAGES
// ============================================================

playerChannel.addEventListener(
    "message",
    (event) => {

        const data = event.data;


        // ----------------------------------------------------
        // Another page started playing a song
        // ----------------------------------------------------

        if (data.type === "START_PLAYING") {

            playlistQueue = data.queue || [];

            currentTrackIndex =
                data.index || 0;

            saveQueue();

            // STOP THIS PAGE
            masterPlayer.pause();

            masterPlayer.removeAttribute("src");

            statusDisplay.textContent =
                `Now Playing: ${data.song.title}`;
        }


        // ----------------------------------------------------
        // Another page changed the queue
        // ----------------------------------------------------

        if (data.type === "QUEUE_UPDATED") {

            playlistQueue =
                data.queue || [];

            currentTrackIndex =
                data.index || 0;

            saveQueue();

            statusDisplay.textContent =
                "Queue updated.";
        }


        // ----------------------------------------------------
        // Queue finished
        // ----------------------------------------------------

        if (data.type === "QUEUE_FINISHED") {

            statusDisplay.textContent =
                "Playlist queue completed.";
        }
    }
);


// ============================================================
// INITIALIZE
// ============================================================

loadQueue();