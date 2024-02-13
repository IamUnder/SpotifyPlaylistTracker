require("dotenv").config();
const SpotifyWebApi = require("spotify-web-api-node");
const schedule = require("node-schedule");
const twilio = require("twilio");

var lastPlaylist = [];

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI,
});

const twilioClient = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const getAccessToken = async () => {
    try {
        const data = await spotifyApi.clientCredentialsGrant();
        spotifyApi.setAccessToken(data.body["access_token"]);
    } catch (err) {
        console.error("Error getting access token: ", err);
    }
}

const getRefreshToken = async () => {
    try {
        const data = await spotifyApi.refreshAccessToken();
        spotifyApi.setAccessToken(data.body["access_token"]);
    } catch (err) {
        console.error("Error refreshing access token: ", err);
    }
}

const getPlaylist = async (playlistId) => {
    try {
        await getAccessToken();
        const data = await spotifyApi.getPlaylistTracks(playlistId);
        const playlist = data.body.items.map((item) => {
            return {
                name: item.track.name,
                artist: item.track.artists[0].name,
                addedAt: item.added_at
            }
        });
        return playlist;
    } catch (err) {
        console.error("Error checking new songs: ", err);
    }
}

const checkNewSongs = async (playlistId) => {
    const newPlaylist = await getPlaylist(playlistId);
    if (lastPlaylist.length === 0) {
        lastPlaylist = newPlaylist;
        return;
    }
    const newSongs = newPlaylist.filter((song) => {
        return !lastPlaylist.some((lastSong) => {
            return lastSong.name === song.name && lastSong.artist === song.artist;
        });
    });
    if (newSongs.length > 0) {
        console.log("New songs added: ", newSongs);
        newSongs.forEach((song) => {
            sendWhatsappMessage(song);
        });
    }
    lastPlaylist = newPlaylist;
}

const sendWhatsappMessage = (newSong) => {
    twilioClient.messages.create({
        body: `Holi!! Se ha añadido a la playlist la siguiente canción: ${newSong.name} by ${newSong.artist}`,
        from: process.env.TWILIO_WHATSAPP_FROM,
        to: process.env.WHATSAPP_TO
    }).then((message) => {
        console.log("Message sent: ", message.sid);
    }).catch((err) => {
        console.error("Error sending message: ", err);
    });
}

schedule.scheduleJob("*/30 * * * * *", () => {
    console.log("Checking for new songs...");
    checkNewSongs("1WyZv9To7rUCQPN6RnFvcm");
});

console.log("App running...");